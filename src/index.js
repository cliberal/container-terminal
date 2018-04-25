import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'

ReactDOM.render(
  <App
    baseUrl="ws://chenctest-kevinha.tcaas.cn:30850"
    selfLink="/bj1/api/v1/namespaces/changr/pods/testapp-1-dtmc7"
    accessToken="q2MtmOxasG0my-o9YPHj4_Lg2HwrIHWHlSMTjZ49A4Y"
  />,
  document.getElementById('root')
)
registerServiceWorker()
