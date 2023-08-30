const SDS011Wrapper = require("sds011-wrapper");

const main = async () => {
  try {
    const sds011 = new SDS011Wrapper("/dev/ttyUSB0");

    await sds011.setReportingMode("active");
    await sds011.setWorkingPeriod(1);

    sds011.on("measure", (data) => {
      console.log(data);
    });
  } catch (error) {
    console.log("errorrrrrrrrrrrrr", error);
  }
};

main();