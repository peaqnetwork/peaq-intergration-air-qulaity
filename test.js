const SDS011Wrapper = require("sds011-wrapper");
const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");

const main = async () => {
  try {
    const sensor = new SDS011Wrapper("/dev/ttyUSB0");

    console.log("Sensor is now working in passive mode.");
    const reporting = await sensor.getReportingMode();
    console.log("Reporting mode:", reporting);
    const version = await sensor.getVersion();
    console.log("Version:", version);

    sensor
      .setReportingMode("active")
      .then(() => {
        console.log("Sensor is now working in active mode.");
        return sensor.setWorkingPeriod(0); // Sensor will send data as soon as new data is available.
      })
      .then(() => {
        console.log("Working period set to 0 minutes.");
        console.log("\nSensor readings:");

        // Since working period was set to 0 and mode was set to active, this event will be emitted as soon as new data is received.
        sensor.on("measure", (data) => {
          console.log(`[${new Date().toISOString()}] ${JSON.stringify(data)}`);
        });
      })
      .catch((error) => {
        console.log("errorrrrrrrrrrrrr", error);
      });
  } catch (error) {
    console.log("errorrrrrrrrrrrrr", error);
  }
};

// main();

const test = async () => {
  const port = new SerialPort("/dev/ttyUSB0", { baudRate: 9600 });

  const parser = port.pipe(new Readline({ delimiter: "\r\n" }));

  parser.on("data", (data) => {
    let buffer = Buffer.from(data, "hex");
    if (buffer.length === 10 && buffer[0] === 0xaa && buffer[1] === 0xc0) {
      let pm25 = (buffer[3] * 256 + buffer[2]) / 10.0;
      let pm10 = (buffer[5] * 256 + buffer[4]) / 10.0;
      console.log(`PM2.5: ${pm25} μg/m3, PM10: ${pm10} μg/m3`);
    }
  });

  port.on("error", (err) => {
    console.error("Errorrr:", err.message);
  });
};

test();
