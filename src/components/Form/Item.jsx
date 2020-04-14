/*
 * This file is part of KubeSphere Console.
 * Copyright (C) 2019 The KubeSphere Console Authors.
 *
 * KubeSphere Console is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * KubeSphere Console is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with KubeSphere Console.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import PropTypes from "prop-types";
import Schema from "async-validator";
import {
  set,
  get,
  debounce,
  isFunction,
  isEmpty,
  isObject,
  isUndefined,
} from "lodash";
import classnames from "classnames";

export default class FormItem extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    error: PropTypes.object,
    onChange: PropTypes.func,
  };

  static contextTypes = {
    formData: PropTypes.object,
    registerValidate: PropTypes.func,
    resetValidate: PropTypes.func,
    validateResults: PropTypes.array,
    resetValidateResults: PropTypes.func,
    registerGroup: PropTypes.func,
    unRegisterGroup: PropTypes.func,
  };

  state = {
    error: null,
    componentError: null,
  };

  componentDidMount() {
    const { children, rules } = this.props;
    if (rules) {
      this.context.registerValidate(children.props.name, rules);
      this.schema = new Schema({
        [children.props.name]: rules.filter((rule) => !rule.checkOnSubmit),
      });
    }
    if (this.context.registerGroup) {
      this.context.registerGroup(children.props.name);
    }
  }

  componentWillUnmount() {
    const { children, rules } = this.props;
    if (rules) {
      this.context.resetValidate(children.props.name);
      this.schema = null;
    }
    if (this.context.unRegisterGroup) {
      this.context.unRegisterGroup(children.props.name);
    }
  }

  handleValueChange = (name, onChange, value, ...rest) => {
    value = get(value, "currentTarget.value", value);

    if (name) {
      const { formData } = this.context;
      set(formData, name, value);
    }

    if (isFunction(onChange)) {
      onChange(value, rest);
    }

    const { validateResults, resetValidateResults } = this.context;
    if (
      validateResults &&
      validateResults.find((item) => item.field === name)
    ) {
      resetValidateResults && resetValidateResults(name);
    }

    this.forceUpdate();

    if (this.schema && !this.state.componentError) {
      this.validate({ [name]: value });
    }
  };

  handleError = (name, onError, error, ...rest) => {
    if (error !== this.state.componentError) {
      this.setState({ componentError: error });
    }

    if (isFunction(onError)) {
      onError(error, rest);
    }
  };

  validate = debounce((data) => {
    this.schema.validate(data, { firstFields: true }, (errors) => {
      this.setState({ error: errors ? errors[0] : null });
    });
  }, 200);

  getValue = (name, { value: propsValue, defaultValue }) => {
    const { formData } = this.context;
    let value;

    if (isUndefined(formData) || isEmpty(name)) {
      value = propsValue;
    } else {
      value = get(formData, name);
    }

    if (!isUndefined(value)) {
      return value;
    }

    if (!isUndefined(defaultValue) && defaultValue !== "") {
      set(formData, name, defaultValue);
    }

    return defaultValue;
  };

  render() {
    const {
      children,
      error,
      className,
      controlClassName,
      desc,
      label,
      rules = [],
    } = this.props;
    const { validateResults } = this.context;
    const name = children.props.name;

    const childNode = React.cloneElement(children, {
      ...children.props,
      id: name,
      onChange: this.handleValueChange.bind(
        this,
        name,
        children.props.onChange
      ),
      onError: this.handleError.bind(this, name, children.props.onError),
      value: this.getValue(name, children.props),
    });

    const lastError =
      error ||
      this.state.componentError ||
      this.state.error ||
      (validateResults && validateResults.find((item) => item.field === name));

    const classNames = classnames(
      "form-item",
      { "error-item": !isEmpty(lastError) },
      className
    );

    const isRequired = rules.some((rule) => rule.required);

    return (
      <div className={classNames} data-test={`form-item-${name}`}>
        {label && (
          <label className="form-item-label" htmlFor={name}>
            {label}
            {isRequired ? <span className="form-item-required">*</span> : null}
          </label>
        )}
        <div className="form-item-control">
          {childNode}
          {!isEmpty(lastError) && (
            <div className="form-item-error">
              {isObject(lastError.message)
                ? lastError.message.message
                : lastError.message}
            </div>
          )}
          {isEmpty(lastError) && desc && (
            <div className="form-item-desc">{desc}</div>
          )}
        </div>
      </div>
    );
  }
}
