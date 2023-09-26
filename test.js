const SDS011Wrapper = require("sds011-wrapper");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const fs = require('fs');
const path = require('path');

const dataFilePath = path.resolve(__dirname, 'data.json');

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
  const port = new SerialPort(
    { baudRate: 9600, path: "/dev/ttyUSB0" },
    function (err) {
      if (err) {
        return console.log("Error: ", err.message);
      }
    }
  );

  const parser = new ReadlineParser({ delimiter: "\r\n" });
  port.pipe(parser);
  // parser.on("data", console.log);

  // const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  port.write(Buffer.from([0xaa, 0xb4, 0x06, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])); 

parser.on('data', line => {
  const pm25 = parseInt(line.slice(2, 4), 16);
  const pm10 = parseInt(line.slice(4, 6), 16);
  
  console.log('parser PM 2.5:', pm25, 'μg/m^3');
  console.log('parser PM 10:', pm10, 'μg/m^3');
});


  // parser.on("data", (data) => {
  //   let buffer = Buffer.from(data, "hex");
  //   if (buffer.length === 10 && buffer[0] === 0xaa && buffer[1] === 0xc0) {
  //     let pm25 = (buffer[3] * 256 + buffer[2]) / 10.0;
  //     let pm10 = (buffer[5] * 256 + buffer[4]) / 10.0;
  //     console.log(`parser PM2.5: ${pm25} μg/m3, parser PM10: ${pm10} μg/m3`);
  //   }
  //   console.log("this parser", data);
  // });

  // Read data that is available but keep the stream in "paused mode"
  port.on("readable", function () {
    const data = port.read();
    console.log("Data:readable", data);
    let buffer = Buffer.from(data, "hex");
    if (buffer.length >= 9 && ((buffer[0] === 0xaa && buffer[1] === 0xc0) || buffer[0] === 0xc0)) {
      let pm25 = (buffer[3] * 256 + buffer[2]) / 10.0;
      let pm10 = (buffer[5] * 256 + buffer[4]) / 10.0;

      const dataToSave = {
        pm25,
        pm10,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(dataFilePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

      console.log(`Readble PM2.5: ${pm25} μg/m3, PM10: ${pm10} μg/m3`);
    }
  });

  // // // Switches the port into "flowing mode"
  port.on("data", function (data) {
    let buffer = Buffer.from(data, "hex");
    if (buffer.length === 9 && buffer[0] === 0xaa && buffer[1] === 0xc0) {
      let pm25 = (buffer[3] * 256 + buffer[2]) / 10.0;
      let pm10 = (buffer[5] * 256 + buffer[4]) / 10.0;
      console.log(`data PM2.5: ${pm25} μg/m3, PM10: ${pm10} μg/m3`);
    }
  });

  port.on("error", (err) => {
    console.error("Errorrr:", err.message);
  });
};

test();
