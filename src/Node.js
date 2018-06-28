// @flow

import React, { type Node as ReactNode } from 'react';
import { RootContext, PathContext, DedupeContext } from './Context';
import Dedupe from './Dedupe';
import { type Path } from './types/Path';

type ChildFunc = (
  getDragProps: () => Object,
  getDropIndex: (e: DragEvent) => number
) => ReactNode;

type NodeProps = {
  children: ChildFunc | ReactNode,
  id: string,
  dedupeKey?: string,
  index: number
};

type NodePropsWithContext = NodeProps & {
  type: string,
  path: Path[],
  register: *,
  deregister: *,
  getDuplicate: *
};

class Node extends React.Component<NodePropsWithContext> {
  el: ?HTMLElement;

  get path() {
    const { path, type, id, index } = this.props;
    return [...path, { type, id, index }];
  }

  get dedupeKey() {
    const { id, dedupeKey } = this.props;
    return dedupeKey || id;
  }

  getDropIndex = ({ clientY, target }: DragEvent) => {
    // this should never happen!
    if (!target || !(target instanceof HTMLElement)) {
      return 0;
    }

    const { top, height } = target.getBoundingClientRect();
    const offsetY = clientY - top;

    return this.props.index + offsetY > height / 2 ? 1 : 0;
  };

  deregister = () => {};

  reregister = () => {
    const { register, deregister, type, index } = this.props;
    this.deregister();
    register(type, this.dedupeKey, this.path, index);
    this.deregister = () => deregister(type, this.dedupeKey);
  };

  componentDidMount = () => this.reregister();
  componentDidUpdate = () => this.reregister();
  componentWillUnmount = () => this.deregister();

  render = () => {
    const { children, getDuplicate, type, id, index } = this.props;

    return (
      <RootContext.Consumer>
        {({ handleDragStart }) => (
          <PathContext.Provider value={{ path: this.path, type }}>
            {typeof children === 'function'
              ? children(
                  () => ({
                    draggable: true,
                    onDragStart: handleDragStart(this.path, type)
                  }),
                  this.getDropIndex
                )
              : children}
          </PathContext.Provider>
        )}
      </RootContext.Consumer>
    );
  };
}

export default (props: NodeProps) => (
  <PathContext.Consumer>
    {({ path, type }) => (
      <DedupeContext.Consumer>
        {({ register, deregister, getDuplicate }) => (
          <Node
            {...props}
            type={type}
            register={register}
            deregister={deregister}
            getDuplicate={getDuplicate}
            path={path}
          />
        )}
      </DedupeContext.Consumer>
    )}
  </PathContext.Consumer>
);
