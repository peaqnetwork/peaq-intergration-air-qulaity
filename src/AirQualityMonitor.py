import json
import os
import simple_sds011
import time
from simple_sds011 import SDS011
import redis

redis_client = redis.StrictRedis(host=os.environ.get('REDIS_HOST'), port=6379, db=0)

class AirQualityMonitor():

    def __init__(self):
        self.sds = SDS011(port='/dev/ttyUSB0')
        self.sds.open('/dev/ttyUSB0')
        print('SDS011 sensor initialized', self.sds.active)
        # self.sds.mode = 0
        self.sds.period = 1

    def get_measurement(self):
        return {
            'time': int(time.time()),
            'measurement': self.sds.query(),
        }

    def save_measurement_to_redis(self):
        """Saves measurement to redis db"""
        redis_client.lpush('measurements', json.dumps(self.get_measurement(), default=str))

    def get_last_n_measurements(self):
        """Returns the last n measurements in the list"""
        return [json.loads(x) for x in redis_client.lrange('measurements', 0, -1)]

