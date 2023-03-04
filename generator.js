const fs = require("fs");
const { orderStatus, orderCity, deliveryCompany } = require("./model");

const pickValueFromArray = (valueArr) => {
  const index = Math.floor(Math.random() * valueArr.length);
  return valueArr[index];
};

const initIndex = (valueArr) =>
  valueArr.reduce((acc, val) => {
    acc[val] = [];
    return acc;
  }, {});

const collection = {}; // collection is indexed by id, by default
const byStatus = initIndex(orderStatus);
const byCity = initIndex(orderCity);
const byDelivery = initIndex(deliveryCompany);

// execution
const entriesNo = process.argv[2] ? parseInt(process.argv[2]) : 10000;

for (let id = 0; id < entriesNo; id++) {
  const entry = {
    id,
    status: pickValueFromArray(orderStatus),
    city: pickValueFromArray(orderCity),
    delivery: pickValueFromArray(deliveryCompany),
  };

  collection[id] = entry;
  byStatus[entry.status].push(id);
  byCity[entry.city].push(id);
  byDelivery[entry.delivery].push(id);
}

console.log(`saving collection of ${entriesNo} entries...`);

const fileName = `data_${entriesNo}.json`;
fs.writeFileSync(
  fileName,
  JSON.stringify({ collection, byStatus, byCity, byDelivery }, null, 2)
);

console.log(`File "${fileName}" saved successfully`);
