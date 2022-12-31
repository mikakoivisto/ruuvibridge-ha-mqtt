## Ruuvibridge Ruuvitag MQTT discovery for Home Assistant

This provides alternative MQTT discovery for ruuvitag measurements published via https://github.com/Scrin/RuuviBridge/.
Ruuvibridge is great and I recommend using it for parsing measurements from Ruuvi Gateway however it's Home Assistant setup didn't suite my needs.

## Building and testing locally

Create haconfig directory for homeassistant config directory

Build and run:

```bash
docker-compose up -d --build
```

## Running with Home Assistant

Simples way is to run it using docker-compose.yml. The latest versio is available direct from Docker Hub so no need to even build it locally.

```yml
version: "3.4"
services:
  mqtt:
    image: eclipse-mosquitto
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
  ruuvibridge-ha-mqtt:
    image: mikakoivisto/ruuvibridge-ha-mqtt:latest
    links:
      - mqtt
    env_file: 
      - docker.env
```

## Configuration

Add following to docker.env file

```
MQTTHOST=mqtt
MQTTPORT=
MQTTUSER=
MQTTPASS=
RUUVITOPIC=ruuvitag
HASSTOPIC=homeassistant/status
DEBUG=app:info,*:error,spa:info
```

You can also limit which attributes are exposed to Home Assistant with RUUVIATTRIBUTES environment variable. Example:
```
RUUVIATTRIBUTES=temperature,humidity,pressure,dewPoint,batteryVoltage
```

Home Assistant object id is {mac}_{attribute}. The mac is without : and lower case. You can also add prefix to it if you want to prefix them with say ruuvitag or ruuvi by setting RUUVIOBJECTIDPREFIX. Example:
```
RUUVIOBJECTIDPREFIX=ruuvitag
```
This will cause it to generate the sensor object id as ruuvitag_{mac}_{attribute} for example tag with mac CC:2B:E2:4A:E1:59 will have temperature sensor object id sensor.ruuvitag_cc2be24ae159_temperature. Without the prefix it would be sensor.cc2be24ae159_temperature