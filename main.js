const { cryptoWaitReady } = require("@polkadot/util-crypto");
const {
  createStorageKeys,
  generateKeyPair,
  getNetworkApi,
  makePalletQuery,
  sendTransaction,
} = require("./commonFunctions");
const { networks } = require("./constants");
const fs = require('fs');
const path = require('path');

const dataFilePath = path.resolve(__dirname, 'data.json');

const { Sdk } = require("@peaq-network/sdk");
const { SerialPort, ReadlineParser } = require("serialport");

const seed =
  "put impulse gadget fence humble soup mother card yard renew chat quiz";
const name = "peaq-iot-1";

const createDid = async () => {
  const sdkInstance = await Sdk.createInstance({
    baseUrl: networks.PEAQ.ws,
    seed,
  });
  const didvalue = await sdkInstance.did.read({ name });
  if (didvalue) {
    console.log("DID already exists", didvalue);
    return;
  }
  console.log("Creating DID");
  const did = await sdkInstance.did.create({ name });
  did.unsubscribe();

  sdkInstance.disconnect();
};

const storeDataFromFile = async () => {
  try {
    // Check if file exists
    if (!fs.existsSync(dataFilePath)) {
      console.log('data.json does not exist');
      return;
    }

    // Read the file
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    const parsedData = JSON.parse(data);

    // Check if the data exists on the chain
    const checkIfExists = await getStorage("sensorData");
    const actionType = checkIfExists && !checkIfExists?.isStorageFallback ? "updateItem" : "addItem";

    // Call the storage pallet with the read data
    await callStoragePallet("sensorData", JSON.stringify(parsedData), actionType);
    console.log('Data from file stored successfully');
  } catch (error) {
    console.error('Error reading or storing data from file', error);
  }
};

const callStoragePallet = async (itemType, value, action) => {
  try {
    const api = await getNetworkApi(networks.PEAQ);
    const keyPair = generateKeyPair(seed);

    const onChainNonce = (
      await api.rpc.system.accountNextIndex(generateKeyPair(seed).address)
    ).toBn();

    const extrinsic = api.tx.peaqStorage[action](itemType, value);

    const hash = sendTransaction(extrinsic, keyPair, onChainNonce);
    console.log("hash", hash);
    return hash;
  } catch (error) {
    console.error("Error storing data on chain", error);
  }
};

const getStorage = async (itemType) => {
  const machineAddress = generateKeyPair(seed).address;

  const { hashed_key } = createStorageKeys([
    { value: machineAddress, type: 0 },
    { value: itemType, type: 1 },
  ]);

  const checkIfExists = await makePalletQuery("peaqStorage", "itemStore", [
    hashed_key,
  ]);
  return checkIfExists;
};

const getAndStoreSensorData = async () => {
  const port = new SerialPort(
    { baudRate: 9600, path: "/dev/ttyUSB0" },
    function (err) {
      if (err) {
        return console.log("Error: ", err.message);
      }
    }
  );

  const checkIfExists = await getStorage("sensorData");
  const actionType = checkIfExists && !checkIfExists?.isStorageFallback ? "updateItem" : "addItem";

  console.log("checkIfExists", checkIfExists);
    console.log("actionType", actionType);

  const parser = new ReadlineParser({ delimiter: "\r\n" });
  port.pipe(parser);

  port.write(
    Buffer.from([
      0xaa, 0xb4, 0x06, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ])
  );

  parser.on("data", (line) => {
    const pm25 = parseInt(line.slice(2, 4), 16);
    const pm10 = parseInt(line.slice(4, 6), 16);

    console.log("parser PM 2.5:", pm25, "μg/m^3");
    console.log("parser PM 10:", pm10, "μg/m^3");
  });

  port.on("readable", function () {
    const data = port.read();
    console.log("Data:readable", data);
    let buffer = Buffer.from(data, "hex");
    if (buffer.length >= 9 && ((buffer[0] === 0xaa && buffer[1] === 0xc0) || buffer[0] === 0xc0)) {
      let pm25 = (buffer[3] * 256 + buffer[2]) / 10.0;
      let pm10 = (buffer[5] * 256 + buffer[4]) / 10.0;
      const blockData = { pm25, pm10 };
      console.log(`Readble PM2.5: ${pm25} μg/m3, PM10: ${pm10} μg/m3`);
      callStoragePallet("sensorData", JSON.stringify(blockData), actionType);
    }
  });

  port.on("error", (err) => {
    console.error("Errorrr:", err.message);
  });
};

const main = async () => {
  await cryptoWaitReady();
  await createDid();
  await storeDataFromFile();
    // await getAndStoreSensorData();
};

main();
