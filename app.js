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
  hassTopic: process.env.HASSTOPIC || 'homeassistant/status'
}

logDebug(JSON.stringify(config));

class App {
  mqtt;
  discoveredTags = {};
  config;
  constructor(config) {

    this.config = config;
    this.mqtt = mqttApi.connect({
      host: config.mqttHost,
      port: config.mqttPort,
      username: config.mqttUser,
      password: config.mqttPass
    });

    this.registerEventListeners();
    if (this.mqtt.connected) {
      this.mqttConnected();
    }
  }

  mqttConnected() {
    logInfo('MQTT connection established');
    this.mqtt.subscribe(config.hassTopic);
    this.mqtt.subscribe(config.ruuvitagTopic + "/#");
  }

  registerEventListeners() { 
    let self = this;   
    self.mqtt.on('connect', () => {
      self.mqttConnected();
    });

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
      return;
    }
    let measurement = JSON.parse(payload);
    console.log(topic + ": " + payload);
  }

}
const app = new App(config);