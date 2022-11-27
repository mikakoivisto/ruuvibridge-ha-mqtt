const mqttApi = require('mqtt');
const logDebug = require('debug')('app:debug');
const logError = require('debug')('app:error');
const logInfo = require('debug')('app:info');

logInfo.log = console.log.bind(console);

const config = {
  mqttHost: process.env.MQTTHOST || 'localhost',
  mqttPort: process.env.MQTTPORT || '1883',
  mqttUser: process.env.MQTTUSER,
  mqttPass: process.env.MQTTPASS,
  ruuvitagTopic: process.env.RUUVITOPIC || "ruuvitag",
  homeassistantTopicPrefix: process.env.HASSTOPICPREFIX || 'homeassistant',
  hassTopic: process.env.HASSTOPIC ||  'homeassistant/status',
  objectIdPrefix: process.env.RUUVIOBJECTIDPREFIX || '',
  ruuviAttributes: process.env.RUUVIATTRIBUTES || '',
}

logDebug(JSON.stringify(config));

class App {
  mqtt;
  discoveredTags = {};
  config;
  includeAttributes = [];
  constructor(config) {

    this.config = config;
    if (config.ruuviAttributes !== '') {
      this.includeAttributes = config.ruuviAttributes.split(',');
    }
    this.mqtt = mqttApi.connect({
      host: config.mqttHost,
      port: config.mqttPort,
      username: config.mqttUser,
      password: config.mqttPass
    }).on('connect', () => {
      this.registerEventListeners();
      this.mqttConnected();
    });
  }

  mqttConnected() {
    logInfo('MQTT connection established');
    this.mqtt.subscribe(config.homeassistantTopicPrefix + "/status");
    this.mqtt.subscribe(config.ruuvitagTopic + "/#");
  }

  registerEventListeners() { 
    let self = this;   

    self.mqtt.on('reconnect', () => { 
      logInfo('Attempting to reconnect to MQTT broker');
    });

    self.mqtt.on('error', (error) => {
      logError('Unable to connect to MQTT broker.', error.message);
    });

    self.mqtt.on('message', (topic, message) => {
      logDebug('Message received on ' + topic);
      self.handleMessage(topic, message.toString());
    });
  }

  handleMessage(topic, payload) {
    let self = this;
    if (topic === self.config.hassTopic) {
      logInfo("HA reloaded");
      self.discoveredTags = {};
      this.mqtt.publish(config.ruuvitagTopic + "/CC:2B:E2:4A:E1:59", '{"name":"Kids room","mac":"CC:2B:E2:4A:E1:59","timestamp":1669520466,"data_format":5,"temperature":19.82,"humidity":33.02,"pressure":115535,"accelerationX":-0.076,"accelerationY":0.992,"accelerationZ":0.012,"batteryVoltage":2.633,"txPower":4,"rssi":-84,"movementCounter":113,"measurementSequenceNumber":26069,"accelerationTotal":0.9949793967716115,"absoluteHumidity":5.645394044209499,"dewPoint":3.0975793719466598,"equilibriumVaporPressure":2311.0070686396252,"airDensity":1.371388854252395,"accelerationAngleFromX":94.38071857176026,"accelerationAngleFromY":4.435097680410382,"accelerationAngleFromZ":89.30896456186777}')
      setTimeout(() => {
        this.mqtt.publish(config.ruuvitagTopic + "/CC:2B:E2:4A:E1:59", '{"name":"Kids room","mac":"CC:2B:E2:4A:E1:59","timestamp":1669520466,"data_format":5,"temperature":19.82,"humidity":33.02,"pressure":115535,"accelerationX":-0.076,"accelerationY":0.992,"accelerationZ":0.012,"batteryVoltage":2.633,"txPower":4,"rssi":-84,"movementCounter":113,"measurementSequenceNumber":26069,"accelerationTotal":0.9949793967716115,"absoluteHumidity":5.645394044209499,"dewPoint":3.0975793719466598,"equilibriumVaporPressure":2311.0070686396252,"airDensity":1.371388854252395,"accelerationAngleFromX":94.38071857176026,"accelerationAngleFromY":4.435097680410382,"accelerationAngleFromZ":89.30896456186777}');
      }, 5000);
      return;
    }
    let measurement = JSON.parse(payload);
    logDebug(topic + ": " + payload);
    if (self.discoveredTags[measurement.mac]) {
      logDebug(`Tag ${measurement.mac} was already previously discovered`);
      return;
    }
    self.discoveredTags[measurement.mac] = true;
    this.publishSensorDiscovery(measurement, {
      deviceClass: "temperature",
      namePostfix: "temperature",
      jsonAttribute: "temperature",
      jsonAttributeMutator: "",
      unitOfMeasurement: "°C",
      precision: 1,
    });
    this.publishSensorDiscovery(measurement, {
      deviceClass: "humidity",
      namePostfix: "humidity",
      jsonAttribute: "humidity",
      jsonAttributeMutator: "",
      unitOfMeasurement: "%",
      precision: 1,
    });
    this.publishSensorDiscovery(measurement, {
      deviceClass: "pressure",
      namePostfix: "pressure",
      jsonAttribute: "pressure",
      unitOfMeasurement: "hPa",
      precision: 1,
      jsonAttributeMutator: " / 100.0",
    });
    this.publishSensorDiscovery(measurement, {
      deviceClass: "voltage",
      namePostfix: "tag battery voltage",
      jsonAttribute: "batteryVoltage",
      jsonAttributeMutator: "",
      unitOfMeasurement: "V",
      precision: 2,
    });
    this.publishLowBatteryBinarySensorDiscovery(measurement, {
      deviceClass: "battery",
      namePostfix: "tag battery",
      jsonAttribute: "batteryVoltage",
    });    
    this.publishSensorDiscovery(measurement, {
      namePostfix: "absolute humidity",
      jsonAttribute: "absoluteHumidity",
      jsonAttributeMutator: "",
      unitOfMeasurement: "g/m³",
      precision: 2,
      icon: "mdi:water"
    });
    this.publishSensorDiscovery(measurement, {
      deviceClass: "temperature",
      namePostfix: "dew point",
      jsonAttribute: "dewPoint",
      jsonAttributeMutator: "",
      unitOfMeasurement: "°C",
      precision: 1,
      icon: "mdi:water"
    });
    this.publishSensorDiscovery(measurement, {
      deviceClass: "pressure",
      namePostfix: "equilibrium vapor pressure",
      jsonAttribute: "equilibriumVaporPressure",
      jsonAttributeMutator: " / 100.0",
      unitOfMeasurement: "hPa",
      precision: 1
    });
    this.publishSensorDiscovery(measurement, {
      deviceClass: "pressure",
      namePostfix: "air density",
      jsonAttribute: "airDensity",
      jsonAttributeMutator: " / 100.0",
      unitOfMeasurement: "kg/m³",
      precision: 1,
      icon: "mdi:gauge"
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "X acceleration",
      jsonAttribute: "accelerationX",
      jsonAttributeMutator: "",
      unitOfMeasurement: "G",
      precision: 2,
      icon: "mdi:axis-x-arrow"
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "Y acceleration",
      jsonAttribute: "accelerationY",
      jsonAttributeMutator: "",
      unitOfMeasurement: "G",
      precision: 2,
      icon: "mdi:axis-y-arrow"
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "Z acceleration",
      jsonAttribute: "accelerationZ",
      jsonAttributeMutator: "",
      unitOfMeasurement: "G",
      precision: 2,
      icon: "mdi:axis-z-arrow"
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "total acceleration",
      jsonAttribute: "accelerationTotal",
      jsonAttributeMutator: "",
      unitOfMeasurement: "G",
      precision: 2,
      icon: "mdi:axis-arrow"
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "movement counter",
      jsonAttribute: "movementCounter",
      jsonAttributeMutator: "",
      unitOfMeasurement: "x",
      precision: 0,
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "acceleration angle from X axis",
      jsonAttribute: "accelerationAngleFromX",
      jsonAttributeMutator: "",
      unitOfMeasurement: "º",
      precision: 2,
      icon: "mdi:angle-acute"
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "acceleration angle from Y axis",
      jsonAttribute: "accelerationAngleFromY",
      jsonAttributeMutator: "",
      unitOfMeasurement: "º",
      precision: 2,
      icon: "mdi:angle-acute"
    });
    this.publishSensorDiscovery(measurement, {
      namePostfix: "acceleration angle from Z axis",
      jsonAttribute: "accelerationAngleFromZ",
      jsonAttributeMutator: "",
      unitOfMeasurement: "º",
      precision: 2,
      icon: "mdi:angle-acute"
    });
  }

  publishSensorDiscovery(measurement, disco) {
    let self = this;
    if (!measurement[disco.jsonAttribute]) {
      logDebug(`${disco.jsonAttribute} not present in measurement for tag ${measurement.mac}, skipping discovery`);
      return;
    }
    if (self.includeAttributes.length > 0 && !self.includeAttributes.includes(disco.jsonAttribute)) {
      logDebug(self.includeAttributes + " length: " + self.includeAttributes.length);
      logDebug(`${disco.jsonAttribute} not in included attributes, skipping discovery`);
      return;
    }
    let objectIdPrefix = (config.objectIdPrefix !== '') ? config.objectIdPrefix + '_' : '';
    let mac = measurement.mac.replaceAll(':','').toLowerCase();
    let id = `ruuvitag_${mac}_${disco.jsonAttribute}`;
    let objectId = `${objectIdPrefix}${mac}_${disco.jsonAttribute}`;
    let confTopic = `${config.homeassistantTopicPrefix}/sensor/${objectId}/config`;
    let stateTopic = `${config.ruuvitagTopic}/${measurement.mac}`;
    let name = (measurement.name && measurement.name !== '') ? `${measurement.name} ${disco.namePostfix}` : `RuuviTag ${measurement.mac} ${disco.namePostfix}`;
    let valueTemplate = `{{ value_json.${disco.jsonAttribute}${disco.jsonAttributeMutator} | float | round(${disco.precision}) }}`;
    let attributesTemplate = `{
      "mac": "{{value_json.mac}}",
      "dataFormat": "{{value_json.data_format}}",
      "rssi": "{{value_json.rssi}}",
      "txPower": "{{value_json.txPower}}",
      "measurementSequenceNumber": "{{value_json.measurementSequenceNumber}}"
    }`;

    let discoveryConfig = {
      unique_id: id,
      object_id: objectId,
      name: name,
      device_class: disco.deviceClass,
      state_topic: stateTopic,
      json_attributes_topic: stateTopic,
      value_template: valueTemplate,
      json_attributes_template: attributesTemplate,
      icon: disco.icon,
      unit_of_measurement: disco.unit_of_measurement,
      device: {
        manufacturer: "Ruuvi",
        model: "RuuviTag",
        identifiers: [ measurement.mac ],
        name: name
      }
    };

    logDebug(`Publishing to ${confTopic} discovery: ${JSON.stringify(discoveryConfig)}`);
    self.mqtt.publish(confTopic, JSON.stringify(discoveryConfig), { retain: true});
  }

  publishLowBatteryBinarySensorDiscovery(measurement, disco) {
    let self = this;
    if (!measurement[disco.jsonAttribute]) {
      logDebug(`${disco.jsonAttribute} not present in measurement for tag ${measurement.mac}, skipping discovery`);
      return;
    }
    if (self.includeAttributes.length > 0 && !self.includeAttributes.includes(disco.jsonAttribute)) {
      logDebug(self.includeAttributes + " length: " + self.includeAttributes.length);
      logDebug(`${disco.jsonAttribute} not in included attributes, skipping discovery`);
      return;
    }
    let objectIdPrefix = (config.objectIdPrefix !== '') ? config.objectIdPrefix + '_' : '';
    let mac = measurement.mac.replaceAll(':','').toLowerCase();
    let id = `ruuvitag_${mac}_low_battery`;
    let objectId = `${objectIdPrefix}${mac}_low_battery`;
    let confTopic = `${config.homeassistantTopicPrefix}/binary_sensor/${objectId}/config`;
    let stateTopic = `${config.ruuvitagTopic}/${measurement.mac}`;
    let name = (measurement.name && measurement.name !== '') ? `${measurement.name} ${disco.namePostfix}` : `RuuviTag ${measurement.mac} ${disco.namePostfix}`;
    // Thresholds from https://github.com/ruuvi/com.ruuvi.station/issues/335#issuecomment-1173209894
    let valueTemplate = `{% if state_attr('binary_sensor.${objectId}', 'temperature') is not defined or state_attr('binary_sensor.${objectId}', '${disco.jsonAttribute}') is not defined%}Unknown{% elif (state_attr('binary_sensor.${objectId}', 'temperature')|float(default=20)) < -20 and (state_attr('binary_sensor.${objectId}', '${disco.jsonAttribute}')|float(default=3)) < 2 %}ON{% elif (state_attr('binary_sensor.${objectId}', 'temperature')|float(default=20)) < 0 and (state_attr('binary_sensor.${objectId}', '${disco.jsonAttribute}')|float(default=3)) < 2.3 %}ON{% elif (state_attr('binary_sensor.${objectId}', 'temperature')|float(default=20)) >= 0 and (state_attr('binary_sensor.${objectId}', '${disco.jsonAttribute}')|float(default=3)) < 2.5 %}ON{% else %}OFF{% endif %}`;
    let attributesTemplate = `{
      "temperature": "{{value_json.temperature}}",
      "${disco.jsonAttribute}": "{{value_json.${disco.jsonAttribute}}}",
      "mac": "{{value_json.mac}}",
      "dataFormat": "{{value_json.data_format}}",
      "rssi": "{{value_json.rssi}}",
      "txPower": "{{value_json.txPower}}",
      "measurementSequenceNumber": "{{value_json.measurementSequenceNumber}}"
    }`;

    let discoveryConfig = {
      unique_id: id,
      object_id: objectId,
      name: name,
      device_class: disco.deviceClass,
      state_topic: stateTopic,
      json_attributes_topic: stateTopic,
      value_template: valueTemplate,
      json_attributes_template: attributesTemplate,
      icon: disco.icon,
      device: {
        manufacturer: "Ruuvi",
        model: "RuuviTag",
        identifiers: [ measurement.mac ],
        name: name
      }
    };

    logDebug(`Publishing to ${confTopic} discovery: ${JSON.stringify(discoveryConfig)}`);
    self.mqtt.publish(confTopic, JSON.stringify(discoveryConfig), { retain: true});
  }

}
const app = new App(config);