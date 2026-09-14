"""Exercise installation, local WebView rendering and native persistence with fictional data."""
import subprocess, time, pathlib, xml.etree.ElementTree as ET, re
out=pathlib.Path('android-smoke-output');out.mkdir(exist_ok=True)
def adb(*args):
    return subprocess.check_output(['adb',*args],text=True)
def snapshot(name):
    adb('shell','rm','-f','/sdcard/keyu-ui.xml')
    adb('shell','uiautomator','dump','/sdcard/keyu-ui.xml')
    xml=adb('shell','cat','/sdcard/keyu-ui.xml')
    (out/(name+'.xml')).write_text(xml,encoding='utf8')
    return xml
def wait_text(text,name):
    for n in range(25):
        try:
            xml=snapshot(name)
        except subprocess.CalledProcessError:
            time.sleep(2)
            continue
        if text in xml:return xml
        time.sleep(2)
    raise AssertionError('Screen did not contain '+text)
try:
    adb('install','-r','android/app/build/outputs/apk/debug/app-debug.apk')
    adb('shell','am','start','-n','org.keyu.timetable/.MainActivity')
    time.sleep(4)
    xml=wait_text('看看示例','first-launch')
    node=next(n for n in ET.fromstring(xml).iter('node') if '看看示例' in n.attrib.get('text','') or '看看示例' in n.attrib.get('content-desc',''))
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.attrib['bounds']))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    wait_text('虚构示例','demo')
    with (out/'demo.png').open('wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True)
    adb('shell','am','force-stop','org.keyu.timetable')
    adb('shell','am','start','-n','org.keyu.timetable/.MainActivity')
    time.sleep(4)
    wait_text('虚构示例','after-restart')
    prefs=adb('shell','run-as','org.keyu.timetable','cat','shared_prefs/keyu.xml')
    assert '虚构示例' in prefs and '高等数学' in prefs, 'Native persistence failed'
    print('PASS: Android 15 installation, offline local UI, fictional demo and persistence after restart')
finally:
    with (out/'last-screen.png').open('wb') as f:subprocess.run(['adb','exec-out','screencap','-p'],stdout=f)
    (out/'logcat.txt').write_text(adb('logcat','-d'),encoding='utf8')
