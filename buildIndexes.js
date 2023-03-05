const { orderStatus, orderCity, deliveryCompany } = require("./model");

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

const buildIndexes = (collection, repeats) => {
  return buildIndexArr(collection);
};

module.exports = {
  buildIndexes,
};
