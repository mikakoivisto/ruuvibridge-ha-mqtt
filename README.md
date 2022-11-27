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
