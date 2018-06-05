// @flow

import { type Path } from '../types/Path';

const isSubPath = (path: Path[], candidate: Path[]): boolean =>
  candidate.length > path.length &&
  !!path.length &&
  !path.some((el, i) => {
    const { index: i1, type: t1, childrenKey: c1 } = el;
    const { index: i2, type: t2, childrenKey: c2 } = candidate[i];

    // we're still a sub path if the we're on the last and it doesn't have a
    // childrenKey
    return (
      (!isNaN(i1) && i1 !== i2) ||
      (t1 && t1 !== t2) ||
      (c1 !== c2 && i !== path.length - 1)
    );
  });

const pathForMove = (source: Path[], target: Path[]): Path[] => {
  const newPath = [];

  for (let i = 0; i < target.length; i += 1) {
    const targetPathSpec = target[i];
    const { id: kt, index: it, type: tt, childrenKey: ct } =
      targetPathSpec || {};
    const { index: is, childrenKey: cs } = source[i] || {};

    if (i < source.length - 1 && (is !== it || ct !== cs)) {
      return target;
    } else if (i === source.length - 1 && ct === cs && is < it) {
      newPath.push({ id: kt, index: it - 1, type: tt, childrenKey: ct });
    } else {
      newPath.push(targetPathSpec);
    }
  }

  return newPath;
};

export { isSubPath, pathForMove };