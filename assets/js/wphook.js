(()=>{"use strict";var __webpack_modules__={"./node_modules/@wordpress/hooks/build-module/createAddHook.js":
/*!*********************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createAddHook.js ***!
  \*********************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _validateNamespace_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validateNamespace.js */ \"./node_modules/@wordpress/hooks/build-module/validateNamespace.js\");\n/* harmony import */ var _validateHookName_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./validateHookName.js */ \"./node_modules/@wordpress/hooks/build-module/validateHookName.js\");\n/**\n * Internal dependencies\n */\n\n\n/**\n * @callback AddHook\n *\n * Adds the hook to the appropriate hooks container.\n *\n * @param {string}               hookName      Name of hook to add\n * @param {string}               namespace     The unique namespace identifying the callback in the form `vendor/plugin/function`.\n * @param {import('.').Callback} callback      Function to call when the hook is run\n * @param {number}               [priority=10] Priority of this hook\n */\n\n/**\n * Returns a function which, when invoked, will add a hook.\n *\n * @param {import('.').Hooks}    hooks    Hooks instance.\n * @param {import('.').StoreKey} storeKey\n *\n * @return {AddHook} Function that adds a new hook.\n */\n\nfunction createAddHook(hooks, storeKey) {\n  return function addHook(hookName, namespace, callback) {\n    let priority = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;\n    const hooksStore = hooks[storeKey];\n\n    if (!(0,_validateHookName_js__WEBPACK_IMPORTED_MODULE_1__[\"default\"])(hookName)) {\n      return;\n    }\n\n    if (!(0,_validateNamespace_js__WEBPACK_IMPORTED_MODULE_0__[\"default\"])(namespace)) {\n      return;\n    }\n\n    if ('function' !== typeof callback) {\n      // eslint-disable-next-line no-console\n      console.error('The hook callback must be a function.');\n      return;\n    } // Validate numeric priority\n\n\n    if ('number' !== typeof priority) {\n      // eslint-disable-next-line no-console\n      console.error('If specified, the hook priority must be a number.');\n      return;\n    }\n\n    const handler = {\n      callback,\n      priority,\n      namespace\n    };\n\n    if (hooksStore[hookName]) {\n      // Find the correct insert index of the new hook.\n      const handlers = hooksStore[hookName].handlers;\n      /** @type {number} */\n\n      let i;\n\n      for (i = handlers.length; i > 0; i--) {\n        if (priority >= handlers[i - 1].priority) {\n          break;\n        }\n      }\n\n      if (i === handlers.length) {\n        // If append, operate via direct assignment.\n        handlers[i] = handler;\n      } else {\n        // Otherwise, insert before index via splice.\n        handlers.splice(i, 0, handler);\n      } // We may also be currently executing this hook.  If the callback\n      // we're adding would come after the current callback, there's no\n      // problem; otherwise we need to increase the execution index of\n      // any other runs by 1 to account for the added element.\n\n\n      hooksStore.__current.forEach(hookInfo => {\n        if (hookInfo.name === hookName && hookInfo.currentIndex >= i) {\n          hookInfo.currentIndex++;\n        }\n      });\n    } else {\n      // This is the first hook of its type.\n      hooksStore[hookName] = {\n        handlers: [handler],\n        runs: 0\n      };\n    }\n\n    if (hookName !== 'hookAdded') {\n      hooks.doAction('hookAdded', hookName, namespace, callback, priority);\n    }\n  };\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createAddHook);\n//# sourceMappingURL=createAddHook.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createAddHook.js?")},"./node_modules/@wordpress/hooks/build-module/createCurrentHook.js":
/*!*************************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createCurrentHook.js ***!
  \*************************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/**\n * Returns a function which, when invoked, will return the name of the\n * currently running hook, or `null` if no hook of the given type is currently\n * running.\n *\n * @param {import('.').Hooks}    hooks    Hooks instance.\n * @param {import('.').StoreKey} storeKey\n *\n * @return {() => string | null} Function that returns the current hook name or null.\n */\nfunction createCurrentHook(hooks, storeKey) {\n  return function currentHook() {\n    var _hooksStore$__current, _hooksStore$__current2;\n\n    const hooksStore = hooks[storeKey];\n    return (_hooksStore$__current = (_hooksStore$__current2 = hooksStore.__current[hooksStore.__current.length - 1]) === null || _hooksStore$__current2 === void 0 ? void 0 : _hooksStore$__current2.name) !== null && _hooksStore$__current !== void 0 ? _hooksStore$__current : null;\n  };\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createCurrentHook);\n//# sourceMappingURL=createCurrentHook.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createCurrentHook.js?")},"./node_modules/@wordpress/hooks/build-module/createDidHook.js":
/*!*********************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createDidHook.js ***!
  \*********************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval('__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _validateHookName_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validateHookName.js */ "./node_modules/@wordpress/hooks/build-module/validateHookName.js");\n/**\n * Internal dependencies\n */\n\n/**\n * @callback DidHook\n *\n * Returns the number of times an action has been fired.\n *\n * @param {string} hookName The hook name to check.\n *\n * @return {number | undefined} The number of times the hook has run.\n */\n\n/**\n * Returns a function which, when invoked, will return the number of times a\n * hook has been called.\n *\n * @param {import(\'.\').Hooks}    hooks    Hooks instance.\n * @param {import(\'.\').StoreKey} storeKey\n *\n * @return {DidHook} Function that returns a hook\'s call count.\n */\n\nfunction createDidHook(hooks, storeKey) {\n  return function didHook(hookName) {\n    const hooksStore = hooks[storeKey];\n\n    if (!(0,_validateHookName_js__WEBPACK_IMPORTED_MODULE_0__["default"])(hookName)) {\n      return;\n    }\n\n    return hooksStore[hookName] && hooksStore[hookName].runs ? hooksStore[hookName].runs : 0;\n  };\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createDidHook);\n//# sourceMappingURL=createDidHook.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createDidHook.js?')},"./node_modules/@wordpress/hooks/build-module/createDoingHook.js":
/*!***********************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createDoingHook.js ***!
  \***********************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/**\n * @callback DoingHook\n * Returns whether a hook is currently being executed.\n *\n * @param {string} [hookName] The name of the hook to check for.  If\n *                            omitted, will check for any hook being executed.\n *\n * @return {boolean} Whether the hook is being executed.\n */\n\n/**\n * Returns a function which, when invoked, will return whether a hook is\n * currently being executed.\n *\n * @param {import('.').Hooks}    hooks    Hooks instance.\n * @param {import('.').StoreKey} storeKey\n *\n * @return {DoingHook} Function that returns whether a hook is currently\n *                     being executed.\n */\nfunction createDoingHook(hooks, storeKey) {\n  return function doingHook(hookName) {\n    const hooksStore = hooks[storeKey]; // If the hookName was not passed, check for any current hook.\n\n    if ('undefined' === typeof hookName) {\n      return 'undefined' !== typeof hooksStore.__current[0];\n    } // Return the __current hook.\n\n\n    return hooksStore.__current[0] ? hookName === hooksStore.__current[0].name : false;\n  };\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createDoingHook);\n//# sourceMappingURL=createDoingHook.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createDoingHook.js?")},"./node_modules/@wordpress/hooks/build-module/createHasHook.js":
/*!*********************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createHasHook.js ***!
  \*********************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/**\n * @callback HasHook\n *\n * Returns whether any handlers are attached for the given hookName and optional namespace.\n *\n * @param {string} hookName    The name of the hook to check for.\n * @param {string} [namespace] Optional. The unique namespace identifying the callback\n *                             in the form `vendor/plugin/function`.\n *\n * @return {boolean} Whether there are handlers that are attached to the given hook.\n */\n\n/**\n * Returns a function which, when invoked, will return whether any handlers are\n * attached to a particular hook.\n *\n * @param {import('.').Hooks}    hooks    Hooks instance.\n * @param {import('.').StoreKey} storeKey\n *\n * @return {HasHook} Function that returns whether any handlers are\n *                   attached to a particular hook and optional namespace.\n */\nfunction createHasHook(hooks, storeKey) {\n  return function hasHook(hookName, namespace) {\n    const hooksStore = hooks[storeKey]; // Use the namespace if provided.\n\n    if ('undefined' !== typeof namespace) {\n      return hookName in hooksStore && hooksStore[hookName].handlers.some(hook => hook.namespace === namespace);\n    }\n\n    return hookName in hooksStore;\n  };\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createHasHook);\n//# sourceMappingURL=createHasHook.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createHasHook.js?")},"./node_modules/@wordpress/hooks/build-module/createHooks.js":
/*!*******************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createHooks.js ***!
  \*******************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval('__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   _Hooks: () => (/* binding */ _Hooks),\n/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _createAddHook__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createAddHook */ "./node_modules/@wordpress/hooks/build-module/createAddHook.js");\n/* harmony import */ var _createRemoveHook__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./createRemoveHook */ "./node_modules/@wordpress/hooks/build-module/createRemoveHook.js");\n/* harmony import */ var _createHasHook__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./createHasHook */ "./node_modules/@wordpress/hooks/build-module/createHasHook.js");\n/* harmony import */ var _createRunHook__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./createRunHook */ "./node_modules/@wordpress/hooks/build-module/createRunHook.js");\n/* harmony import */ var _createCurrentHook__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./createCurrentHook */ "./node_modules/@wordpress/hooks/build-module/createCurrentHook.js");\n/* harmony import */ var _createDoingHook__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./createDoingHook */ "./node_modules/@wordpress/hooks/build-module/createDoingHook.js");\n/* harmony import */ var _createDidHook__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./createDidHook */ "./node_modules/@wordpress/hooks/build-module/createDidHook.js");\n/**\n * Internal dependencies\n */\n\n\n\n\n\n\n\n/**\n * Internal class for constructing hooks. Use `createHooks()` function\n *\n * Note, it is necessary to expose this class to make its type public.\n *\n * @private\n */\n\nclass _Hooks {\n  constructor() {\n    /** @type {import(\'.\').Store} actions */\n    this.actions = Object.create(null);\n    this.actions.__current = [];\n    /** @type {import(\'.\').Store} filters */\n\n    this.filters = Object.create(null);\n    this.filters.__current = [];\n    this.addAction = (0,_createAddHook__WEBPACK_IMPORTED_MODULE_0__["default"])(this, \'actions\');\n    this.addFilter = (0,_createAddHook__WEBPACK_IMPORTED_MODULE_0__["default"])(this, \'filters\');\n    this.removeAction = (0,_createRemoveHook__WEBPACK_IMPORTED_MODULE_1__["default"])(this, \'actions\');\n    this.removeFilter = (0,_createRemoveHook__WEBPACK_IMPORTED_MODULE_1__["default"])(this, \'filters\');\n    this.hasAction = (0,_createHasHook__WEBPACK_IMPORTED_MODULE_2__["default"])(this, \'actions\');\n    this.hasFilter = (0,_createHasHook__WEBPACK_IMPORTED_MODULE_2__["default"])(this, \'filters\');\n    this.removeAllActions = (0,_createRemoveHook__WEBPACK_IMPORTED_MODULE_1__["default"])(this, \'actions\', true);\n    this.removeAllFilters = (0,_createRemoveHook__WEBPACK_IMPORTED_MODULE_1__["default"])(this, \'filters\', true);\n    this.doAction = (0,_createRunHook__WEBPACK_IMPORTED_MODULE_3__["default"])(this, \'actions\');\n    this.applyFilters = (0,_createRunHook__WEBPACK_IMPORTED_MODULE_3__["default"])(this, \'filters\', true);\n    this.currentAction = (0,_createCurrentHook__WEBPACK_IMPORTED_MODULE_4__["default"])(this, \'actions\');\n    this.currentFilter = (0,_createCurrentHook__WEBPACK_IMPORTED_MODULE_4__["default"])(this, \'filters\');\n    this.doingAction = (0,_createDoingHook__WEBPACK_IMPORTED_MODULE_5__["default"])(this, \'actions\');\n    this.doingFilter = (0,_createDoingHook__WEBPACK_IMPORTED_MODULE_5__["default"])(this, \'filters\');\n    this.didAction = (0,_createDidHook__WEBPACK_IMPORTED_MODULE_6__["default"])(this, \'actions\');\n    this.didFilter = (0,_createDidHook__WEBPACK_IMPORTED_MODULE_6__["default"])(this, \'filters\');\n  }\n\n}\n/** @typedef {_Hooks} Hooks */\n\n/**\n * Returns an instance of the hooks object.\n *\n * @return {Hooks} A Hooks instance.\n */\n\nfunction createHooks() {\n  return new _Hooks();\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createHooks);\n//# sourceMappingURL=createHooks.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createHooks.js?')},"./node_modules/@wordpress/hooks/build-module/createRemoveHook.js":
/*!************************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createRemoveHook.js ***!
  \************************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _validateNamespace_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validateNamespace.js */ \"./node_modules/@wordpress/hooks/build-module/validateNamespace.js\");\n/* harmony import */ var _validateHookName_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./validateHookName.js */ \"./node_modules/@wordpress/hooks/build-module/validateHookName.js\");\n/**\n * Internal dependencies\n */\n\n\n/**\n * @callback RemoveHook\n * Removes the specified callback (or all callbacks) from the hook with a given hookName\n * and namespace.\n *\n * @param {string} hookName  The name of the hook to modify.\n * @param {string} namespace The unique namespace identifying the callback in the\n *                           form `vendor/plugin/function`.\n *\n * @return {number | undefined} The number of callbacks removed.\n */\n\n/**\n * Returns a function which, when invoked, will remove a specified hook or all\n * hooks by the given name.\n *\n * @param {import('.').Hooks}    hooks             Hooks instance.\n * @param {import('.').StoreKey} storeKey\n * @param {boolean}              [removeAll=false] Whether to remove all callbacks for a hookName,\n *                                                 without regard to namespace. Used to create\n *                                                 `removeAll*` functions.\n *\n * @return {RemoveHook} Function that removes hooks.\n */\n\nfunction createRemoveHook(hooks, storeKey) {\n  let removeAll = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;\n  return function removeHook(hookName, namespace) {\n    const hooksStore = hooks[storeKey];\n\n    if (!(0,_validateHookName_js__WEBPACK_IMPORTED_MODULE_1__[\"default\"])(hookName)) {\n      return;\n    }\n\n    if (!removeAll && !(0,_validateNamespace_js__WEBPACK_IMPORTED_MODULE_0__[\"default\"])(namespace)) {\n      return;\n    } // Bail if no hooks exist by this name.\n\n\n    if (!hooksStore[hookName]) {\n      return 0;\n    }\n\n    let handlersRemoved = 0;\n\n    if (removeAll) {\n      handlersRemoved = hooksStore[hookName].handlers.length;\n      hooksStore[hookName] = {\n        runs: hooksStore[hookName].runs,\n        handlers: []\n      };\n    } else {\n      // Try to find the specified callback to remove.\n      const handlers = hooksStore[hookName].handlers;\n\n      for (let i = handlers.length - 1; i >= 0; i--) {\n        if (handlers[i].namespace === namespace) {\n          handlers.splice(i, 1);\n          handlersRemoved++; // This callback may also be part of a hook that is\n          // currently executing.  If the callback we're removing\n          // comes after the current callback, there's no problem;\n          // otherwise we need to decrease the execution index of any\n          // other runs by 1 to account for the removed element.\n\n          hooksStore.__current.forEach(hookInfo => {\n            if (hookInfo.name === hookName && hookInfo.currentIndex >= i) {\n              hookInfo.currentIndex--;\n            }\n          });\n        }\n      }\n    }\n\n    if (hookName !== 'hookRemoved') {\n      hooks.doAction('hookRemoved', hookName, namespace);\n    }\n\n    return handlersRemoved;\n  };\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createRemoveHook);\n//# sourceMappingURL=createRemoveHook.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createRemoveHook.js?")},"./node_modules/@wordpress/hooks/build-module/createRunHook.js":
/*!*********************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/createRunHook.js ***!
  \*********************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/**\n * Returns a function which, when invoked, will execute all callbacks\n * registered to a hook of the specified type, optionally returning the final\n * value of the call chain.\n *\n * @param {import('.').Hooks}    hooks                  Hooks instance.\n * @param {import('.').StoreKey} storeKey\n * @param {boolean}              [returnFirstArg=false] Whether each hook callback is expected to\n *                                                      return its first argument.\n *\n * @return {(hookName:string, ...args: unknown[]) => unknown} Function that runs hook callbacks.\n */\nfunction createRunHook(hooks, storeKey) {\n  let returnFirstArg = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;\n  return function runHooks(hookName) {\n    const hooksStore = hooks[storeKey];\n\n    if (!hooksStore[hookName]) {\n      hooksStore[hookName] = {\n        handlers: [],\n        runs: 0\n      };\n    }\n\n    hooksStore[hookName].runs++;\n    const handlers = hooksStore[hookName].handlers; // The following code is stripped from production builds.\n\n    if (true) {\n      // Handle any 'all' hooks registered.\n      if ('hookAdded' !== hookName && hooksStore.all) {\n        handlers.push(...hooksStore.all.handlers);\n      }\n    }\n\n    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {\n      args[_key - 1] = arguments[_key];\n    }\n\n    if (!handlers || !handlers.length) {\n      return returnFirstArg ? args[0] : undefined;\n    }\n\n    const hookInfo = {\n      name: hookName,\n      currentIndex: 0\n    };\n\n    hooksStore.__current.push(hookInfo);\n\n    while (hookInfo.currentIndex < handlers.length) {\n      const handler = handlers[hookInfo.currentIndex];\n      const result = handler.callback.apply(null, args);\n\n      if (returnFirstArg) {\n        args[0] = result;\n      }\n\n      hookInfo.currentIndex++;\n    }\n\n    hooksStore.__current.pop();\n\n    if (returnFirstArg) {\n      return args[0];\n    }\n  };\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (createRunHook);\n//# sourceMappingURL=createRunHook.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/createRunHook.js?")},"./node_modules/@wordpress/hooks/build-module/index.js":
/*!*************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/index.js ***!
  \*************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   actions: () => (/* binding */ actions),\n/* harmony export */   addAction: () => (/* binding */ addAction),\n/* harmony export */   addFilter: () => (/* binding */ addFilter),\n/* harmony export */   applyFilters: () => (/* binding */ applyFilters),\n/* harmony export */   createHooks: () => (/* reexport safe */ _createHooks__WEBPACK_IMPORTED_MODULE_0__[\"default\"]),\n/* harmony export */   currentAction: () => (/* binding */ currentAction),\n/* harmony export */   currentFilter: () => (/* binding */ currentFilter),\n/* harmony export */   defaultHooks: () => (/* binding */ defaultHooks),\n/* harmony export */   didAction: () => (/* binding */ didAction),\n/* harmony export */   didFilter: () => (/* binding */ didFilter),\n/* harmony export */   doAction: () => (/* binding */ doAction),\n/* harmony export */   doingAction: () => (/* binding */ doingAction),\n/* harmony export */   doingFilter: () => (/* binding */ doingFilter),\n/* harmony export */   filters: () => (/* binding */ filters),\n/* harmony export */   hasAction: () => (/* binding */ hasAction),\n/* harmony export */   hasFilter: () => (/* binding */ hasFilter),\n/* harmony export */   removeAction: () => (/* binding */ removeAction),\n/* harmony export */   removeAllActions: () => (/* binding */ removeAllActions),\n/* harmony export */   removeAllFilters: () => (/* binding */ removeAllFilters),\n/* harmony export */   removeFilter: () => (/* binding */ removeFilter)\n/* harmony export */ });\n/* harmony import */ var _createHooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createHooks */ \"./node_modules/@wordpress/hooks/build-module/createHooks.js\");\n/**\n * Internal dependencies\n */\n\n/** @typedef {(...args: any[])=>any} Callback */\n\n/**\n * @typedef Handler\n * @property {Callback} callback  The callback\n * @property {string}   namespace The namespace\n * @property {number}   priority  The namespace\n */\n\n/**\n * @typedef Hook\n * @property {Handler[]} handlers Array of handlers\n * @property {number}    runs     Run counter\n */\n\n/**\n * @typedef Current\n * @property {string} name         Hook name\n * @property {number} currentIndex The index\n */\n\n/**\n * @typedef {Record<string, Hook> & {__current: Current[]}} Store\n */\n\n/**\n * @typedef {'actions' | 'filters'} StoreKey\n */\n\n/**\n * @typedef {import('./createHooks').Hooks} Hooks\n */\n\nconst defaultHooks = (0,_createHooks__WEBPACK_IMPORTED_MODULE_0__[\"default\"])();\nconst {\n  addAction,\n  addFilter,\n  removeAction,\n  removeFilter,\n  hasAction,\n  hasFilter,\n  removeAllActions,\n  removeAllFilters,\n  doAction,\n  applyFilters,\n  currentAction,\n  currentFilter,\n  doingAction,\n  doingFilter,\n  didAction,\n  didFilter,\n  actions,\n  filters\n} = defaultHooks;\n\n//# sourceMappingURL=index.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/index.js?")},"./node_modules/@wordpress/hooks/build-module/validateHookName.js":
/*!************************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/validateHookName.js ***!
  \************************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/**\n * Validate a hookName string.\n *\n * @param {string} hookName The hook name to validate. Should be a non empty string containing\n *                          only numbers, letters, dashes, periods and underscores. Also,\n *                          the hook name cannot begin with `__`.\n *\n * @return {boolean} Whether the hook name is valid.\n */\nfunction validateHookName(hookName) {\n  if ('string' !== typeof hookName || '' === hookName) {\n    // eslint-disable-next-line no-console\n    console.error('The hook name must be a non-empty string.');\n    return false;\n  }\n\n  if (/^__/.test(hookName)) {\n    // eslint-disable-next-line no-console\n    console.error('The hook name cannot begin with `__`.');\n    return false;\n  }\n\n  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(hookName)) {\n    // eslint-disable-next-line no-console\n    console.error('The hook name can only contain numbers, letters, dashes, periods and underscores.');\n    return false;\n  }\n\n  return true;\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (validateHookName);\n//# sourceMappingURL=validateHookName.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/validateHookName.js?")},"./node_modules/@wordpress/hooks/build-module/validateNamespace.js":
/*!*************************************************************************!*\
  !*** ./node_modules/@wordpress/hooks/build-module/validateNamespace.js ***!
  \*************************************************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/**\n * Validate a namespace string.\n *\n * @param {string} namespace The namespace to validate - should take the form\n *                           `vendor/plugin/function`.\n *\n * @return {boolean} Whether the namespace is valid.\n */\nfunction validateNamespace(namespace) {\n  if ('string' !== typeof namespace || '' === namespace) {\n    // eslint-disable-next-line no-console\n    console.error('The namespace must be a non-empty string.');\n    return false;\n  }\n\n  if (!/^[a-zA-Z][a-zA-Z0-9_.\\-\\/]*$/.test(namespace)) {\n    // eslint-disable-next-line no-console\n    console.error('The namespace can only contain numbers, letters, dashes, periods, underscores and slashes.');\n    return false;\n  }\n\n  return true;\n}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (validateNamespace);\n//# sourceMappingURL=validateNamespace.js.map\n\n//# sourceURL=webpack://wepos/./node_modules/@wordpress/hooks/build-module/validateNamespace.js?")},"./assets/vendors/wp-hook/index.js":
/*!*****************************************!*\
  !*** ./assets/vendors/wp-hook/index.js ***!
  \*****************************************/(__unused_webpack_module,__webpack_exports__,__webpack_require__)=>{eval('__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _wordpress_hooks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/hooks */ "./node_modules/@wordpress/hooks/build-module/index.js");\n\nwindow.wepos.wpPackages = {\n  hooks: (0,_wordpress_hooks__WEBPACK_IMPORTED_MODULE_0__.createHooks)()\n};\n\n//# sourceURL=webpack://wepos/./assets/vendors/wp-hook/index.js?')}},__webpack_module_cache__={};function __webpack_require__(e){var o=__webpack_module_cache__[e];if(void 0!==o)return o.exports;var n=__webpack_module_cache__[e]={exports:{}};return __webpack_modules__[e](n,n.exports,__webpack_require__),n.exports}__webpack_require__.d=(e,o)=>{for(var n in o)__webpack_require__.o(o,n)&&!__webpack_require__.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:o[n]})},__webpack_require__.o=(e,o)=>Object.prototype.hasOwnProperty.call(e,o),__webpack_require__.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var __webpack_exports__=__webpack_require__("./assets/vendors/wp-hook/index.js")})();