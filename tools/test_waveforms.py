#!/usr/bin/env python3
import array
import unittest
from build_waveforms import envelope, allowed_source

class WaveTests(unittest.TestCase):
    def test_envelope(self):
        samples=array.array("h",[0,0,1000,-500,0,32000,-32768,0])
        peaks=envelope(samples,count=4)
        self.assertEqual(peaks[0],0)
        self.assertAlmostEqual(peaks[1],1000/32768,delta=0.0001)
        self.assertAlmostEqual(peaks[2],32000/32768,delta=0.0001)
        self.assertEqual(peaks[3],1)
    def test_host_safety(self):
        self.assertTrue(allowed_source("https://pub-example.r2.dev/Angel%20%5B%23%5D.mp3"))
        self.assertFalse(allowed_source("http://pub-example.r2.dev/song.mp3"))
        self.assertFalse(allowed_source("https://evil.com/audio.mp3"))
        self.assertFalse(allowed_source("https://127.0.0.1/private.mp3"))
        self.assertFalse(allowed_source("https://foo.r2.dev.evil.com/hello"))

if __name__=="__main__":
    unittest.main()
