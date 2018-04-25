import React, { Component } from 'react'
import { Terminal } from 'xterm'
import 'xterm/dist/xterm.css'

function utf8_to_b64(str) {
  return window.btoa(window.unescape(encodeURIComponent(str)))
}
function b64_to_utf8(str) {
  return decodeURIComponent(window.escape(window.atob(str)))
}

export default class ContainerTerminal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      connected: false,
      cols: props.cols || 80,
      rows: props.rows || 24,
    }

    this.alive = null // 心跳的引用
    this.first = true

    this.containerRef = React.createRef()
  }

  componentDidMount() {
    window.onresize = this.onResize
    const cWidth = this.containerRef.current.clientWidth
    const cHeight = this.containerRef.current.clientHeight
    const term = this.initialize(this.containerRef.current)
    const { width, height } = term.charMeasure
    this.setState({
      cols: Math.floor(cWidth / width),
      rows: Math.floor(cHeight / height),
    })
    term.charMeasure.on('charsizechanged', this.sizeViewport)
    term.on('data', data => this.ws && this.ws.readyState === 1 && this.ws.send('0' + utf8_to_b64(data)))
  }

  onResize = () => {
    const cWidth = this.containerRef.current.clientWidth
    const cHeight = this.containerRef.current.clientHeight
    if (this.term) {
      const { width, height } = this.term.charMeasure
      this.setState({
        cols: Math.floor(cWidth / width),
        rows: Math.floor(cHeight / height),
      })
      this.sizeTerminal()
    }
  }

  componentWillUnmount() {
    this.term.destroy()
    this.disconnect()
  }

  initialize = element => {
    const state = this.state
    const term = new Terminal({
      cols: state.cols,
      rows: state.rows,
      cursorBlink: true,
      fontFamily: "Monaco, Consolas, 'Courier New', 'Courier', monospace",
      fontSize: 12,
      lineHeight: 1,
      theme: {
        foreground: '#f0f0f0',
      },
      screenKeys: true,
      applicationCursor: true, // Needed for proper scrollback behavior in applications like vi
      mouseEvents: true, // Needed for proper scrollback behavior in applications like vi
    })
    term.open(element)
    term.cursorHidden = true
    term.refresh(term.buffer.y, term.buffer.y)
    this.term = term
    this.connect()
    return term
  }

  generateUrl = () => {
    const { baseUrl, accessToken, selfLink } = this.props
    let url = ''
    url += selfLink
    url += '/exec'
    if (url.indexOf('?') === -1) {
      url += '?'
    }
    url += 'stdout=1&stdin=1&stderr=1&tty=1'
    let command = ['/bin/sh', '-i']
    command.forEach(arg => {
      url += '&command=' + encodeURIComponent(arg)
    })
    url = baseUrl + url
    if (accessToken) {
      url += `&access_token=${accessToken}`
    }
    return url
  }

  connect = () => {
    this.disconnect()
    this.term.reset()
    const url = this.generateUrl()
    this.ws = new WebSocket(url, 'base64.channel.k8s.io')
    let ws = this.ws
    ws.onopen = ev => {
      this.alive = window.setInterval(() => ws.send('0'), 30 * 1000)
      this.sizeTerminal()
    }
    ws.onmessage = ev => {
      const data = ev.data.slice(1)
      switch (ev.data[0]) {
        case '1':
        case '2':
        case '3':
          this.term.write(b64_to_utf8(data))
          break
        default:
          break
      }
      if (this.first) {
        this.first = false
        this.term.cursorHidden = false
        this.term.showCursor()
        this.term.element && this.term.focus()
      }
    }
    ws.onclose = ev => {
      this.setState({
        connected: false,
      })
      this.fatal(ev.reason)
    }
    ws.onerror = ex => {
      this.fatal(ex.message)
    }
    this.setState({
      connected: true,
    })
  }

  disconnect = () => {
    this.setState({
      connected: false,
    })
    /* There's no term.hideCursor() function */
    if (this.term) {
      this.term.cursorHidden = true
      this.term.refresh(this.term.buffer.y, this.term.buffer.y)
    }

    if (this.ws) {
      const ws = this.ws
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null
      if (ws.readyState < 2) {
        // CLOSING
        ws.close()
        this.ws = null
      }
    }
    window.clearInterval(this.alive)
    this.alive = null
  }

  fatal = message => {
    let first = this.first
    if (!message && first) message = 'Could not connect to the container. Do you have sufficient privileges?'
    if (!message) message = 'disconnected'
    if (!first) message = '\r\n' + message
    this.term.write('\x1b[31m' + message + '\x1b[m\r\n')
    this.setState({
      connected: false,
    })
    this.disconnect()
  }

  sizeViewport = () => {
    let { cols, rows } = this.state
    if (!this.term.charMeasure.width) {
      return
    }
    const xtermViewport = this.containerRef.current.getElementsByClassName('xterm-viewport')[0]
    xtermViewport.style.width = this.term.charMeasure.width * cols + 17 + 'px'
    xtermViewport.style.height = this.term.charMeasure.height * rows
  }

  sizeTerminal = () => {
    const { cols, rows } = this.state
    this.term.resize(cols, rows)
    this.sizeViewport()
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send('4' + window.btoa('{"Width":' + cols + ',"Height":' + rows + '}'))
    }
  }

  render() {
    return (
      <kubernetes-container-terminal
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          padding: '0 6px',
          background: '#000000',
        }}
        ref={this.containerRef}
      />
    )
  }
}
