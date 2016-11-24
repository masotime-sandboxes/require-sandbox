import getApple from 'main/lib/util';
import HomePage from 'components/pages';

const App = new HomePage();

console.log(App.render({ name: getApple() + getApple() }));
