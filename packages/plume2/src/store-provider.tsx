import React from 'react';
import { getDisplayName } from './helper';
import Store from './store';
import { IOptions, IMap } from './typing';

export type TStore = new (...args: Array<any>) => Store;

// 创建 StoreContext
const StoreContext = React.createContext<Store | null>(null);

export default function StoreProvider(AppStore: TStore, opts?: IOptions) {
  return function wrapper(Base: React.ComponentClass): any {
    return class WrapperComponent extends Base {
      static displayName = `StoreProvider(${getDisplayName(Base)})`;

      constructor(props: Object) {
        super(props);

        const cfg = opts || { debug: false };
        this.store = new AppStore(cfg);
        this._isMounted = false;
        this._isDebug = cfg.debug;
        this.state = { ...this.state, ...this.store.state().toObject() };

        this.store.subscribe(this._handleStoreChange);
        if (process.env.NODE_ENV !== 'production' && cfg.debug) {
          if (window) {
            const cssRule =
              'color: rgb(249, 162, 34);' +
              'font-size: 40px;' +
              'font-weight: bold;' +
              'text-shadow: 1px 1px 5px rgb(249, 162, 34);' +
              'filter: dropshadow(color=rgb(249, 162, 34), offx=1, offy=1);';
            const version = require('../package.json').version;
            console.log(`%cplume2@${version}🚀`, cssRule);
          }
        }
      }

      store: Store;
      state: Object;
      _isMounted: boolean;
      _isDebug: boolean;

      componentWillMount() {
        super.componentWillMount && super.componentWillMount();
        this._isMounted = false;

        if (process.env.NODE_ENV !== 'production' && this._isDebug) {
          console.log(`${WrapperComponent.displayName} will mount 🚀`);
        }
      }

      componentDidMount() {
        super.componentDidMount && super.componentDidMount();
        this._isMounted = true;

        if (process.env.NODE_ENV !== 'production' && this._isDebug) {
          const displayName = getDisplayName(Base);
          window['_plume2App'] = window['_plume2App'] || {};
          window['_plume2App'][displayName] = {
            store: this.store
          };
        }
      }

      componentWillUpdate(nextProps, nextState, nextContext) {
        super.componentWillUpdate &&
          super.componentWillUpdate(nextProps, nextState, nextContext);
        this._isMounted = false;
      }

      componentDidUpdate(prevProps, prevState, prevContext) {
        super.componentDidUpdate &&
          super.componentDidUpdate(prevProps, prevState, prevContext);
        this._isMounted = true;
      }

      componentWillUnmount() {
        super.componentWillUnmount && super.componentWillUnmount();
        this.store.unsubscribe(this._handleStoreChange);
        this.store.destroy();

        if (process.env.NODE_ENV !== 'production' && this._isDebug) {
          const displayName = getDisplayName(Base);
          delete window['_plume2App'][displayName];
        }
      }

      render() {
        const node = super.render() as React.ReactElement<any>;
        // node 传递props
        // @ts-ignore
        const props = Object.assign({}, this.props);
        return (
          <StoreContext.Provider value={this.store}>
            {React.cloneElement(node, props)}
          </StoreContext.Provider>
        );
      }

      _handleStoreChange = (state: IMap) => {
        if (process.env.NODE_ENV !== 'production' && this._isDebug) {
          console.log(`\n${WrapperComponent.displayName} will update 🚀`);
        }

        this.setState(state.toObject());
      };
    };
  };
}
export { StoreContext };
