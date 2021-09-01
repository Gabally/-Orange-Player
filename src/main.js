import Vue from 'vue'
import App from './App.vue'
const smalltalk = require('smalltalk');

Vue.config.productionTip = false

Object.defineProperty(Vue.prototype, '$smalltalk', { value: smalltalk });

new Vue({
    render: h => h(App),
}).$mount('#app')