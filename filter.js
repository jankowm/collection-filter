const METHOD = {
  intersection: 1,
  iterativeCol: 2,
  iterativeIndexPojo: 3,
  iterativeIndexMap: 4,
  iterativeIndexSet: 5,
};

// control - pass as filter value to run all tests with exactly same algorithm
const CONTROL_RUN = "control-run";

const getIndexName = (filterKey) =>
  `by${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`;

const getIndex = ({ filterKey, filterVal, index }) => {
  const indexName = getIndexName(filterKey);

  return Array.isArray(filterVal)
    ? filterVal.map((val) => index[indexName][val])
    : index[indexName][filterVal];
};

const controlRun = (data) =>
  resolveSingleFilterIndexArr({ filter: { status: "ACTIVE" }, data });

/**
 * Single filter resolvers
 */
const resolveSingleFilterIndexArr = ({ filter, data }) => {
  const [[filterKey, filterVal]] = Object.entries(filter);
  const values = !Array.isArray(filterVal) ? [filterVal] : filterVal;

  const indexName = getIndexName(filterKey);

  return values
    .map((val) => data.indexArr[indexName][val])
    .reduce((acc, ids) => acc.concat(ids), [])
    .map((id) => data.collection[id]);
};

const resolveSingleFilterIndexPojo = ({ filter, data }) => {
  const [[filterKey, filterVal]] = Object.entries(filter);
  const values = !Array.isArray(filterVal) ? [filterVal] : filterVal;
  const indexName = getIndexName(filterKey);

  return values
    .map((val) => Object.keys(data.indexPojo[indexName][val]))
    .reduce((acc, ids) => acc.concat(ids), [])
    .map((id) => data.collection[id]);
};

const resolveSingleFilterIndexMap = ({ filter, data }) => {
  const [[filterKey, filterVal]] = Object.entries(filter);
  const values = !Array.isArray(filterVal) ? [filterVal] : filterVal;
  const indexName = getIndexName(filterKey);

  return values
    .map((val) => Array.from(data.indexMap[indexName][val].keys()))
    .reduce((acc, ids) => acc.concat(ids), [])
    .map((id) => data.collection[id]);
};

const resolveSingleFilterIndexSet = ({ filter, data }) => {
  const [[filterKey, filterVal]] = Object.entries(filter);
  const values = !Array.isArray(filterVal) ? [filterVal] : filterVal;
  const indexName = getIndexName(filterKey);

  return values
    .map((val) => Array.from(data.indexSet[indexName][val]))
    .reduce((acc, ids) => acc.concat(ids), [])
    .map((id) => data.collection[id]);
};

/**
 * Filter methods
 */
const filterIntersection = ({ filter, data }) => {
  if (filter === CONTROL_RUN) {
    return controlRun(data);
  }

  if (Object.keys(filter).length === 1) {
    return resolveSingleFilterIndexArr({ filter, data });
  }

  const filterIndexArr = Object.entries(filter).map(
    ([filterKey, filterVal]) => {
      const indexVal = getIndex({ filterKey, filterVal, index: data.indexArr });
      return Array.isArray(indexVal) ? indexVal.flat() : indexVal;
    }
  );

  const intersectionCount = filterIndexArr.reduce((acc, index) => {
    index.forEach((id) => {
      if (!acc[id]) {
        acc[id] = 1;
      } else {
        acc[id]++;
      }
    });
    return acc;
  }, {});

  return Object.entries(intersectionCount)
    .filter(([_, count]) => count === filterIndexArr.length)
    .map(([id]) => data.collection[id]);
};

const filterIterativeCol = ({ filter, data }) => {
  if (filter === CONTROL_RUN) {
    return controlRun(data);
  }

  if (Object.keys(filter).length === 1) {
    return resolveSingleFilterIndexArr({ filter, data });
  }

  const filterIndexMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex({ filterKey, filterVal, index: data.indexArr });
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(filterIndexMap).sort(
    (filterA, filterB) => {
      const arrA = filterIndexMap[filterA];
      const arrB = filterIndexMap[filterB];

      const lengthA = Array.isArray(arrA)
        ? arrA.reduce((acc, arr) => acc + arr.length, 0)
        : arrA.length;
      const lengthB = Array.isArray(arrB)
        ? arrB.reduce((acc, arr) => acc + arr.length, 0)
        : arrB.length;

      return lengthA - lengthB;
    }
  );

  const smallestIndexArr = filterIndexMap[filtersSortedFromSmallest[0]];
  const initCollection = Array.isArray(smallestIndexArr)
    ? smallestIndexArr.flat().map((id) => data.collection[id])
    : smallestIndexArr.map((id) => data.collection[id]);

  return filtersSortedFromSmallest.slice(1).reduce((col, filterKey) => {
    const filterVal = filter[filterKey];
    const compareFn = Array.isArray(filterVal)
      ? (item) => filterVal.includes(item[filterKey])
      : (item) => item[filterKey] === filterVal;

    return col.filter(compareFn);
  }, initCollection);
};

const filterIterativePojo = ({ filter, data }) => {
  if (filter === CONTROL_RUN) {
    return controlRun(data);
  }

  if (Object.keys(filter).length === 1) {
    return resolveSingleFilterIndexPojo({ filter, data });
  }

  const filterIndexMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex({
        filterKey,
        filterVal,
        index: data.indexPojo,
      });
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(filterIndexMap).sort(
    (filterA, filterB) => {
      const pojoA = filterIndexMap[filterA];
      const pojoB = filterIndexMap[filterB];

      const lengthA = Array.isArray(pojoA)
        ? pojoA.reduce((acc, pojo) => acc + Object.keys(pojo).length, 0)
        : Object.keys(pojoA);
      const lengthB = Array.isArray(pojoB)
        ? pojoB.reduce((acc, pojo) => acc + Object.keys(pojo).length, 0)
        : Object.keys(pojoB);

      return lengthA - lengthB;
    }
  );

  const smallestIndexPojo = filterIndexMap[filtersSortedFromSmallest[0]];
  const initIds = Array.isArray(smallestIndexPojo)
    ? smallestIndexPojo.flatMap((pojo) => Object.keys(pojo))
    : Object.keys(smallestIndexPojo);

  return filtersSortedFromSmallest
    .slice(1)
    .reduce((ids, filterKey) => {
      const pojos = filterIndexMap[filterKey];

      return Array.isArray(pojos)
        ? ids.filter((id) =>
            pojos.reduce((acc, pojo) => acc || pojo[id], false)
          )
        : ids.filter((id) => pojos[id]);
    }, initIds)
    .map((id) => data.collection[id]);
};

const filterIterativeMap = ({ filter, data }) => {
  if (filter === CONTROL_RUN) {
    return controlRun(data);
  }

  if (Object.keys(filter).length === 1) {
    return resolveSingleFilterIndexMap({ filter, data });
  }

  const filterIndexMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex({ filterKey, filterVal, index: data.indexMap });
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(filterIndexMap).sort(
    (filterA, filterB) => {
      const mapsA = filterIndexMap[filterA];
      const mapsB = filterIndexMap[filterB];

      const sizeA = Array.isArray(mapsA)
        ? mapsA.reduce((acc, map) => acc + map.size, 0)
        : mapsA.size;
      const sizeB = Array.isArray(mapsB)
        ? mapsB.reduce((acc, map) => acc + map.size, 0)
        : mapsB.size;

      return sizeA - sizeB;
    }
  );

  const smallestIndexMap = filterIndexMap[filtersSortedFromSmallest[0]];
  const initIds = Array.isArray(smallestIndexMap)
    ? smallestIndexMap.flatMap((map) => Array.from(map.keys()))
    : Array.from(smallestIndexMap.keys());

  return filtersSortedFromSmallest
    .slice(1)
    .reduce((ids, filterKey) => {
      const maps = filterIndexMap[filterKey];

      return Array.isArray(maps)
        ? ids.filter((id) =>
            maps.reduce((acc, map) => acc || map.has(id), false)
          )
        : ids.filter((id) => maps.has(id));
    }, initIds)
    .map((id) => data.collection[id]);
};

const filterIterativeSet = ({ filter, data }) => {
  if (filter === CONTROL_RUN) {
    return controlRun(data);
  }

  if (Object.keys(filter).length === 1) {
    return resolveSingleFilterIndexSet({ filter, data });
  }

  const filterIndexMap = Object.entries(filter).reduce(
    (acc, [filterKey, filterVal]) => {
      acc[filterKey] = getIndex({ filterKey, filterVal, index: data.indexSet });
      return acc;
    },
    {}
  );

  const filtersSortedFromSmallest = Object.keys(filterIndexMap).sort(
    (filterA, filterB) => {
      const setsA = filterIndexMap[filterA];
      const setsB = filterIndexMap[filterB];

      const sizeA = Array.isArray(setsA)
        ? setsA.reduce((acc, set) => acc + set.size, 0)
        : setsA.size;
      const sizeB = Array.isArray(setsB)
        ? setsB.reduce((acc, set) => acc + set.size, 0)
        : setsB.size;

      return sizeA - sizeB;
    }
  );

  const smallestIndexSet = filterIndexMap[filtersSortedFromSmallest[0]];
  const initIds = Array.isArray(smallestIndexSet)
    ? smallestIndexSet.flatMap((set) => Array.from(set.values()))
    : Array.from(smallestIndexSet.values());

  return filtersSortedFromSmallest
    .slice(1)
    .reduce((ids, filterKey) => {
      const sets = filterIndexMap[filterKey];

      return Array.isArray(sets)
        ? ids.filter((id) =>
            sets.reduce((acc, set) => acc || set.has(id), false)
          )
        : ids.filter((id) => sets.has(id));
    }, initIds)
    .map((id) => data.collection[id]);
};

module.exports = {
  CONTROL_RUN,

  filterIntersection,
  filterIterativeCol,
  filterIterativePojo,
  filterIterativeMap,
  filterIterativeSet,
};
