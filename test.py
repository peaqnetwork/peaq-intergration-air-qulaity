import serial
import time

# Open the serial port connected to the SDS011.
# Adjust the device name to match your actual device, e.g., '/dev/ttyUSB0'
ser = serial.Serial('/dev/ttyUSB0', baudrate=9600, stopbits=1, parity="N", timeout=2)

def process_frame(data):
    pm25 = ((data[3] * 256) + data[2]) / 10.0
    pm10 = ((data[5] * 256) + data[4]) / 10.0
    return pm25, pm10

while True:
    data = ser.read(10)
    if data[0] == 0xAA and data[1] == 0xC0:
        pm25, pm10 = process_frame(data)
        print(f"PM2.5: {pm25} μg/m3, PM10: {pm10} μg/m3")
    time.sleep(1)
