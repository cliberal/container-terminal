# container-terminal

> This is the react transplant version of [kubernetes-container-terminal](https://github.com/kubernetes-ui/container-terminal).

## Usage

```jsx
import ContainerTerminal from 'container-termial'

class App extends React.Component {
  render() {
    return <ContainerTerminal baseUrl="" accessToken="" selfLink="" />
  }
}
```

## Tips

use [react-loadable](https://github.com/jamiebuilds/react-loadable) to split xterm.js.

> makesure react version >=16
