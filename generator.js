const fs = require("fs");
const { orderStatus, orderCity, deliveryCompany } = require("./model");

const pickValueFromArray = (valueArr) => {
  const index = Math.floor(Math.random() * valueArr.length);
  return valueArr[index];
};

const entriesNo = process.argv[2] ? parseInt(process.argv[2]) : 10000;
const collection = {}; // collection is indexed by id, by default

for (let id = 0; id < entriesNo; id++) {
  collection[id] = {
    id,
    status: pickValueFromArray(orderStatus),
    city: pickValueFromArray(orderCity),
    delivery: pickValueFromArray(deliveryCompany),
  };
}

console.log(`saving collection of ${entriesNo} entries...`);

const fileName = `data_${entriesNo}.json`;
fs.writeFileSync(fileName, JSON.stringify({ collection }, null, 2));

console.log(`File "${fileName}" saved successfully`);
