/**
 * KARSA v0.3.1 — Runtime Helper Emitter
 * ----------------------------------------------------------------------------
 * Refinement lvl.4C: runtime helper emitter dipisah dari compiler utama.
 */

'use strict';

const RUNTIME_HELPERS = `
const __subscribers = new WeakMap();
const __effectMap = new WeakMap();
let __activeEffect = null;
let __effectId = 0;

function __createReactive(val) {
  const obj = { value: val, __id: ++__effectId };
  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (__activeEffect && prop === 'value') {
        let subs = __subscribers.get(proxy) || new Set();
        subs.add(__activeEffect);
        __subscribers.set(proxy, subs);
        if (__activeEffect.__deps) __activeEffect.__deps.add(proxy);
      }
      return target[prop];
    },
    set(target, prop, newVal) {
      const oldVal = target[prop];
      target[prop] = newVal;
      if (prop === 'value' && oldVal !== newVal) {
        const subs = __subscribers.get(proxy);
        if (subs) {
          const subsCopy = Array.from(subs);
          for (let i = 0; i < subsCopy.length; i++) subsCopy[i](newVal, oldVal);
        }
      }
      return true;
    }
  });
  return proxy;
}

function __createComputed(fn) {
  const reactive = __createReactive(null);
  const effect = function computedEffect() {
    __activeEffect = effect;
    try { reactive.value = fn(); } catch(e) { /* defer if deps not ready */ }
    __activeEffect = null;
  };
  effect.__deps = new Set();
  effect.__isComputed = true;
  effect();
  __effectMap.set(reactive, effect);
  return reactive;
}

function __watch(reactive, cb) {
  const effect = function watchEffect(n, o) { cb(n, o); };
  effect.__deps = new Set();
  let subs = __subscribers.get(reactive) || new Set();
  subs.add(effect);
  __subscribers.set(reactive, subs);
  const unsub = function unsubscribe() {
    const subs = __subscribers.get(reactive);
    if (subs) subs.delete(effect);
  };
  return unsub;
}

function __setState(reactive, val) {
  reactive.value = val;
}

function __createElement(tag, props, children) {
  if (!props) props = {};
  if (!children) children = [];
  const el = document.createElement(tag === 'fragmen' ? 'div' : tag);
  if (props.id) el.id = props.id;
  if (props.className) el.className = props.className;
  if (props.innerText) el.innerText = props.innerText;
  if (props.src) el.src = props.src;
  if (props.href) el.href = props.href;
  children.forEach(function(child) { el.appendChild(child); });
  return el;
}

function __mount(target, parent) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (el) {
    if (parent) {
      const parentEl = typeof parent === 'string' ? document.querySelector(parent) : parent;
      if (parentEl) parentEl.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
  }
}

function __cleanup(reactive) {
  const effect = __effectMap.get(reactive);
  if (effect && effect.__deps) {
    effect.__deps.forEach(function(dep) {
      const subs = __subscribers.get(dep);
      if (subs) subs.delete(effect);
    });
    effect.__deps.clear();
  }
  const subs = __subscribers.get(reactive);
  if (subs) subs.clear();
}
`;

function emitRuntimeHelpers(compiler) {
  compiler.emit("// === Runtime Helpers ===");
  compiler.output.push(RUNTIME_HELPERS.trim());
  compiler.emit("");
}

module.exports = {
  RUNTIME_HELPERS,
  emitRuntimeHelpers
};
