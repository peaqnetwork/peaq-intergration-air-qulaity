const SDS011Wrapper = require("sds011-wrapper");

const sds011 = new SDS011Wrapper("/dev/ttyUSB0");

sds011.setReportingMode("active");
sds011.setWorkingPeriod(1);

sds011.on("measure", (data) => {
    console.log(data);
});