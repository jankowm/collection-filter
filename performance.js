const testPerformance = ({ fn, warmUpRepeats, runRepeats }) => {
  let result = null;

  // warm up
  for (let i = 0; i < warmUpRepeats; i++) {
    result = fn();
  }

  // execution
  let timer = process.hrtime();
  for (let i = 0; i < runRepeats; i++) {
    result = fn();
  }
  timer = process.hrtime(timer);
  const time = (timer[0] * 1000 + timer[1] / 1000000) / runRepeats;

  return {
    result,
    time,
  };
};

const printTime = (time) => `${time.toFixed(1)}ms`;

module.exports = {
  testPerformance,
  printTime,
};
