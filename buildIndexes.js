const { orderStatus, orderCity, deliveryCompany } = require("./model");

// index array
const initIndexArr = () => {
  const initIndexValues = (arr) =>
    arr.reduce((acc, val) => {
      acc[val] = [];
      return acc;
    }, {});

  return {
    byStatus: initIndexValues(orderStatus),
    byCity: initIndexValues(orderCity),
    byDelivery: initIndexValues(deliveryCompany),
  };
};

const buildIndexArr = (collection) => {
  const indexArr = initIndexArr();
  Object.entries(collection).forEach(([id, entry]) => {
    indexArr.byStatus[entry.status].push(id);
    indexArr.byCity[entry.city].push(id);
    indexArr.byDelivery[entry.delivery].push(id);
  });
  return indexArr;
};

// index pojo
const initIndexPojo = () => {
  const initIndexValues = (arr) =>
    arr.reduce((acc, val) => {
      acc[val] = {};
      return acc;
    }, {});

  return {
    byStatus: initIndexValues(orderStatus),
    byCity: initIndexValues(orderCity),
    byDelivery: initIndexValues(deliveryCompany),
  };
};

const buildIndexPojo = (collection) => {
  const indexPojo = initIndexPojo();
  Object.entries(collection).forEach(([id, entry]) => {
    indexPojo.byStatus[entry.status][id] = true;
    indexPojo.byCity[entry.city][id] = true;
    indexPojo.byDelivery[entry.delivery][id] = true;
  });
  return indexPojo;
};

// index map
const initIndexMap = () => {
  const initIndexValues = (arr) =>
    arr.reduce((acc, val) => {
      acc[val] = new Map();
      return acc;
    }, {});

  return {
    byStatus: initIndexValues(orderStatus),
    byCity: initIndexValues(orderCity),
    byDelivery: initIndexValues(deliveryCompany),
  };
};

const buildIndexMap = (collection) => {
  const indexMap = initIndexMap();
  Object.entries(collection).forEach(([id, entry]) => {
    indexMap.byStatus[entry.status].set(id, true);
    indexMap.byCity[entry.city].set(id, true);
    indexMap.byDelivery[entry.delivery].set(id, true);
  });
  return indexMap;
};

// index set
const initIndexSet = () => {
  const initIndexValues = (arr) =>
    arr.reduce((acc, val) => {
      acc[val] = new Set();
      return acc;
    }, {});

  return {
    byStatus: initIndexValues(orderStatus),
    byCity: initIndexValues(orderCity),
    byDelivery: initIndexValues(deliveryCompany),
  };
};

const buildIndexSet = (collection) => {
  const indexSet = initIndexSet();
  Object.entries(collection).forEach(([id, entry]) => {
    indexSet.byStatus[entry.status].add(id);
    indexSet.byCity[entry.city].add(id);
    indexSet.byDelivery[entry.delivery].add(id);
  });
  return indexSet;
};

module.exports = {
  buildIndexArr,
  buildIndexPojo,
  buildIndexMap,
  buildIndexSet,
};
