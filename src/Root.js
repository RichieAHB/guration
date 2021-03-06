// @flow

import React, { type Node as ReactNode } from 'react';
import { RootContext, PathContext } from './Context';
import Node from './Node';
import { move, insert } from './Edits';
import { isSubPath, isSibling, pathForMove, hasMoved } from './utils/PathUtils';
import { type Path } from './types/Path';
import { type InsertData, type MoveData } from './types/Data';
import { type ChildCountSpec } from './types/Children';
import { type Edit } from './Edits';
import { type GetDuplicate } from './Dedupe';

const INTERNAL_TRANSFER_TYPE = '@@TRANSFER';

type RootProps = {
  type: string,
  id: string,
  onChange: (edits: Edit[]) => void,
  onError: (error: string) => void,
  dropMappers: {
    [string]: (data: string) => InsertData | string
  },
  children: ReactNode
};

class Root extends React.Component<RootProps> {
  static defaultProps = {
    onError: () => {}
  };

  handleDragStart = (path: Path[], type: string) => (e: DragEvent) => {
    if (!e.dataTransfer) {
      return;
    }
    e.dataTransfer.setData(
      INTERNAL_TRANSFER_TYPE,
      JSON.stringify({
        path,
        type
      })
    );
  };

  getDropData(e: DragEvent) {
    const { dropMappers } = this.props;

    const { dataTransfer } = e;

    if (!dataTransfer) {
      return 'Unable to drop';
    }

    const type = Object.keys(dropMappers).find(key =>
      dataTransfer.getData(key)
    );

    if (!type) {
      return 'Unable to drop this';
    }

    return dropMappers[type](dataTransfer.getData(type));
  }

  handleDrop = (
    path: Path[],
    getDuplicate: GetDuplicate,
    childInfo: ?ChildCountSpec
  ) => (e: DragEvent) => {
    const { dataTransfer } = e;

    if (!dataTransfer) {
      return;
    }

    const moveDataStr = dataTransfer.getData(INTERNAL_TRANSFER_TYPE);

    if (moveDataStr) {
      const moveData: MoveData = JSON.parse(moveDataStr);
      this.handleMove(moveData, path, childInfo);
      return;
    }

    if (childInfo && childInfo.childrenCount >= childInfo.maxChildren) {
      this.props.onError(
        'Cannot drop, too many children and have not implemented replace logic'
      );
      return;
    }

    const data = this.getDropData(e);

    if (typeof data === 'string') {
      this.props.onError(data);
      return;
    }

    this.handleInsert(data, path, getDuplicate);
  };

  handleMove(dragData: MoveData, path: Path[], childInfo: ?ChildCountSpec) {
    const { path: dragPath } = dragData;

    const { type: dragType, id } = dragPath[dragPath.length - 1];
    const { type } = path[path.length - 1];

    if (dragType !== type) {
      this.props.onError(`can't drop ${dragType} where ${type} should go`);
      return;
    }

    if (isSubPath(dragPath, path)) {
      this.props.onError(`can't drop into itself`);
      return;
    }

    if (
      isSibling(dragPath, path) &&
      childInfo &&
      childInfo.childrenCount >= childInfo.maxChildren
    ) {
      this.props.onError(
        'Cannot drop, too many children and have not implemented replace logic'
      );
      return;
    }

    const movePath = pathForMove(dragPath, path);

    const { index } = movePath[movePath.length - 1];

    const edits = [
      hasMoved(dragPath, path)
        ? move(type, id, dragPath, movePath, index)
        : null
    ].filter(Boolean);

    if (edits.length) {
      this.props.onChange(edits);
    }
  }

  handleInsert(
    { type: dragType, id }: InsertData,
    path: Path[],
    getDuplicate: GetDuplicate
  ) {
    const { type, index } = path[path.length - 1];
    if (dragType !== type) {
      this.props.onError(`can't drop ${dragType} where ${type} should go`);
      return;
    }

    const duplicate = getDuplicate(dragType, id);

    if (duplicate) {
      this.handleMove(duplicate, path);
    } else {
      this.props.onChange([insert(type, id, path, index)].filter(Boolean));
    }
  }

  render() {
    const { type, id, children } = this.props;
    return (
      <PathContext.Consumer>
        {({ ...pathContext }) => (
          <PathContext.Provider value={{ ...pathContext, type }}>
            <RootContext.Provider
              value={{
                handleDragStart: this.handleDragStart,
                handleDrop: this.handleDrop
              }}
            >
              <Node type={type} id={id} index={0}>
                {children}
              </Node>
            </RootContext.Provider>
          </PathContext.Provider>
        )}
      </PathContext.Consumer>
    );
  }
}

export default Root;
