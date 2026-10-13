"""Offline regression checks. Run with Python; set NODE_BINARY if Node is not on PATH."""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
NODE=os.environ.get('NODE_BINARY') or shutil.which('node')


@unittest.skipUnless(NODE,'Node.js is required; set NODE_BINARY to its executable.')
class Helpers(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='real demo video ')
        self.base=Path(self.temp.name);self.project=self.base/'recording'
        subprocess.run([NODE,str(ROOT/'scripts/init.mjs'),'--out',str(self.project)],check=True,capture_output=True)
        self.env={k:v for k,v in os.environ.items() if not k.startswith('DEMO_TTS_')}

    def tearDown(self):self.temp.cleanup()

    def test_init_does_not_overwrite_existing_recordings(self):
        original=self.project/'plan.json';original.write_text('Keep my existing plan',encoding='utf-8')
        result=subprocess.run([NODE,str(ROOT/'scripts/init.mjs'),'--out',str(self.project)],capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(original.read_text(encoding='utf-8'),'Keep my existing plan')

    def test_missing_voice_configuration_fails_before_network_and_does_not_log_key(self):
        self.env['DEMO_TTS_API_KEY']='test-secret-do-not-log'
        result=subprocess.run([NODE,'speech.mjs'],cwd=self.project,env=self.env,capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('No paid request was made',result.stderr)
        self.assertNotIn('test-secret-do-not-log',result.stderr+result.stdout)

    def test_existing_audio_is_imported_with_the_correct_sentence(self):
        audio=self.base/'supplied audio';audio.mkdir()
        with wave.open(str(audio/'overview-0.wav'),'wb') as writer:
            writer.setnchannels(1);writer.setsampwidth(2);writer.setframerate(48000);writer.writeframes(b'\0'*4800*2)
        result=subprocess.run([NODE,'speech.mjs','--audio-dir',str(audio)],cwd=self.project,env=self.env,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        manifest=json.loads((self.project/'build/speech.json').read_text(encoding='utf-8'))
        plan=json.loads((self.project/'plan.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['clips'][0]['text'],plan['scenes'][0]['sentences'][0])
        self.assertEqual((self.project/manifest['clips'][0]['file']).read_bytes(),(audio/'overview-0.wav').read_bytes())


if __name__=='__main__':unittest.main()
