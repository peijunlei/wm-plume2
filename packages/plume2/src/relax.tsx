import React from 'react';
import { StoreContext } from './store-provider'; // 路径需修改为实际位置
import { getDisplayName, isNeedRxStoreChange } from './helper';
import { PartialQueryLang } from './pql';
import { QueryLang } from './ql';
import { isArray, isObject, isString } from './type';
import { IMap, IRelaxComponent } from './typing';
import { fromJS, is } from 'immutable';

export default function RelaxContainer(Wrapper: IRelaxComponent): any {
  return class Relax extends React.Component {
    static displayName = `Relax(${getDisplayName(Wrapper)})`;
    static defaultProps = Wrapper.defaultProps || {};
    static relaxProps = Wrapper.relaxProps || {};

    static contextType = StoreContext; // 设置上下文类型

    constructor(props: Object) {
      super(props);
      this._isMounted = false;
      this.state = { storeState: {} };
      this._isDebug = this.context ? this.context._opts.debug : false;

      if (process.env.NODE_ENV != 'production' && this._isDebug) {
        require('./helper/relax-dev-helper').ifTooManyRelaxContainer.watch(
          Relax
        );
      }

      this._isNeedRxStore = isNeedRxStoreChange(Relax.relaxProps);
      if (this._isNeedRxStore && this.context) {
        this.context.subscribe(this._handleStoreChange);
      }
    }

    _relaxProxy: Object;
    _isDebug: boolean;
    _relaxProps: Object;
    _isMounted: boolean;
    _isNeedRxStore: boolean;

    componentWillMount() {
      this._isMounted = false;
      this._relaxProps = this._computeRelaxProps();

      if (process.env.NODE_ENV != 'production' && this._isDebug) {
        require('./helper/relax-dev-helper').outputRelaxProps({
          Relax,
          relax: this,
          lifecycle: 'willMount'
        });
      }
    }

    componentDidMount() {
      this._isMounted = true;
    }

    componentWillUpdate() {
      this._isMounted = false;
    }

    componentDidUpdate() {
      this._isMounted = true;
    }

    shouldComponentUpdate(nextProps) {
      const newRelaxProps = this._computeRelaxProps();

      if (
        !is(fromJS(this.props), fromJS(nextProps)) ||
        !is(fromJS(this._relaxProps), fromJS(newRelaxProps))
      ) {
        this._relaxProps = newRelaxProps;

        if (process.env.NODE_ENV != 'production' && this._isDebug) {
          require('./helper/relax-dev-helper').outputRelaxProps({
            Relax,
            relax: this,
            lifecycle: 'willUpdate'
          });
        }

        return true;
      } else {
        return false;
      }
    }

    componentWillUnmount() {
      if (this._isNeedRxStore && this.context) {
        this.context.unsubscribe(this._handleStoreChange);
      }

      if (process.env.NODE_ENV != 'production' && this._isDebug) {
        require('./helper/relax-dev-helper').ifTooManyRelaxContainer.unwatch(
          Relax
        );
      }
    }

    render() {
      return (
        <Wrapper
          ref={relaxProxy => (this._relaxProxy = relaxProxy)}
          {...this.props}
          relaxProps={this._relaxProps}
        />
      );
    }

    _computeRelaxProps() {
      const relaxProps = {};
      let staticRelaxProps = Relax.relaxProps;
      const store = this.context;

      if (isArray(staticRelaxProps)) {
        staticRelaxProps = (staticRelaxProps as Array<any>).reduce(
          (preVal: Object, curVal) => {
            if (isString(curVal)) {
              preVal[curVal] = curVal;
            } else if (isArray(curVal)) {
              const len = curVal.length;
              const lastName = curVal[len - 1];
              preVal[lastName] = curVal;
            } else if (curVal instanceof QueryLang) {
              preVal[curVal.name()] = curVal;
            } else if (curVal instanceof PartialQueryLang) {
              preVal[curVal.name()] = curVal;
            } else if (isObject(curVal)) {
              preVal = { ...preVal, ...curVal };
            }
            return preVal;
          },
          {}
        );
      }

      for (let propName in staticRelaxProps) {
        const propValue = staticRelaxProps[propName];
        if (propValue === 'viewAction') {
          relaxProps[propName] = store.viewAction;
          if (process.env.NODE_ENV != 'production' && this._isDebug) {
            require('./helper/relax-dev-helper').ifNoViewActionInStore(store);
          }
        } else if (
          isString(propValue) ||
          isArray(propValue) ||
          propValue instanceof QueryLang
        ) {
          relaxProps[propName] = store.bigQuery(propValue);
        } else if (typeof propValue === 'function') {
          const storeMethod = store[propName];
          relaxProps[propName] = storeMethod || propValue;
          if (process.env.NODE_ENV != 'production') {
            !storeMethod &&
              console.warn(`store can not find '${propName}' method.`);
          }
        } else if (propValue instanceof PartialQueryLang) {
          relaxProps[propName] = propValue.partialQL(store.bigQuery);
        }
      }

      return relaxProps;
    }

    _handleStoreChange = (state: IMap) => {
      if (this._isMounted) {
        this.setState({ storeState: state });
      }
    };
  };
}
