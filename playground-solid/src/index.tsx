/* @refresh reload */
import { render } from 'solid-js/web'

import './index.css'
import App from './App.civet'

render(() => <App />, document.getElementById('root') as HTMLElement);
