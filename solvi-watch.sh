#!/usr/bin/env bash
set -euo pipefail
# Self-contained Solvi release watcher for macOS (ZSH shell works).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 - "$ROOT" "$@" <<'SOLVI_PYTHON'
import os,sys,re,json,time,hashlib,zipfile,tempfile,shutil,subprocess,urllib.request,fcntl,datetime,stat,shlex,http.server,threading,traceback
from pathlib import Path

ROOT=Path(sys.argv[1]).resolve()
ARGS=sys.argv[2:]
WATCH=('--once' not in ARGS and '--dry-run' not in ARGS)
DRY=('--dry-run' in ARGS)
if any(a not in ('--watch','--once','--dry-run','--help','--last-log') for a in ARGS):
 print('Usage: ./solvi-watch.sh [--watch | --once | --dry-run | --last-log]',file=sys.stderr);sys.exit(2)
if '--help' in ARGS:
 print('Usage: ./solvi-watch.sh [--watch | --once | --dry-run | --last-log]')
 print('By default watches updates/*.zip; --once processes present ZIPs; --dry-run validates only.')
 print('Server: root@yolo.cx:18021 -> /var/www/mojoworks/labs/solvi/')
 print('GitHub SSH: git@github.com:sylwesterdigital/solvi.git (main)')
 print('URL: https://mojoworks.xyz/labs/solvi/')
 print('Logs: .solvi/logs/ (use --last-log to print the latest log)')
 sys.exit(0)

# Fixed deployment target — no server configuration or environment variables required.
UPDATES=ROOT/'updates'
STATE=ROOT/'.solvi'
REMOTE_HOST='root@yolo.cx'
REMOTE_PORT='18021'
REMOTE='/var/www/mojoworks/labs/solvi'
PUBLIC='https://mojoworks.xyz/labs/solvi/'
GITHUB_SSH='git@github.com:sylwesterdigital/solvi.git'
GITHUB_BRANCH='main'
DEPLOY_KEYS=['index.html','styles.css','js','assets','vendor','releases.json']
GIT_KEYS=['index.html','styles.css','js','assets','vendor','releases.json','download-three.mjs','download-xr-profiles.mjs','package.json','tests','serve.mjs','serve-https.mjs','create-certs.mjs','start-local.sh','start-lan.sh','start-local.bat','start-lan.bat','README.md','docs','.gitignore','solvi-watch.sh']
REQUIRED=['index.html','styles.css','js/main.js','js/scene.js','js/dev-overlay.js','assets/anthropomorphiccat3dmodel.glb','download-three.mjs','package.json']
VENDOR_REQUIRED=['vendor/three.module.js','vendor/addons/loaders/GLTFLoader.js','vendor/addons/loaders/DRACOLoader.js','vendor/addons/webxr/XRControllerModelFactory.js','vendor/addons/webxr/XRHandModelFactory.js','vendor/draco/draco_decoder.wasm']
SHA_RE=re.compile(r'^[a-f0-9]{64}$'); VER_RE=re.compile(r'^\d+\.\d+\.\d+$')
VALID_PATH=re.compile(r'^[\w./-]+$')

# ANSI colours are for terminals only. Release logs are always plain UTF-8 text,
# suitable for sharing in GitHub issues or pasting into ChatGPT.
USE_COLOR=sys.stdout.isatty() and os.environ.get('NO_COLOR') is None and os.environ.get('TERM','')!='dumb'
ANSI={
 'START':'\033[1;35m', 'STEP':'\033[1;34m', 'PASS':'\033[1;32m',
 'FAIL':'\033[1;31m', 'WARN':'\033[1;33m', 'INFO':'\033[0;36m',
 'DONE':'\033[1;32m', 'CMD':'\033[2m'
}
LOG_FILE=None

def stamp():
 return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def write_log(line):
 if LOG_FILE is not None:
  with LOG_FILE.open('a',encoding='utf-8') as handle:
   handle.write(line+'\n')

def status(level,message):
 tag=f'[{level:<5}]'
 line=f'{stamp()} {tag} {message}'
 write_log(line)
 colour=ANSI.get(level,'') if USE_COLOR else ''
 reset='\033[0m' if colour else ''
 print(f'{stamp()} {colour}{tag}{reset} {message}',flush=True)

def log(message):status('INFO',message)

def begin_release_log(archive):
 global LOG_FILE
 directory=STATE/'logs';directory.mkdir(parents=True,exist_ok=True)
 now=datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
 safe=re.sub(r'[^A-Za-z0-9._-]+','_',archive.stem)[:70]
 candidate=directory/f'{now}_{safe}.log'
 number=2
 while candidate.exists():
  candidate=directory/f'{now}_{safe}_{number}.log';number+=1
 LOG_FILE=candidate
 status('START',f'DEPLOYMENT BEGIN — {archive.name}')
 status('INFO',f'Log: {LOG_FILE}')

def step(name,fn):
 status('STEP',name)
 try:
  value=fn()
 except Exception as exc:
  status('FAIL',f'{name} — {exc}')
  raise
 status('PASS',name)
 return value

def last_log():
 logs=sorted((STATE/'logs').glob('*.log')) if (STATE/'logs').is_dir() else []
 if not logs:
  print('No deployment logs found in '+str(STATE/'logs'),file=sys.stderr)
  return 1
 print('=== '+str(logs[-1])+' ===')
 print(logs[-1].read_text(encoding='utf-8'),end='')
 return 0

def run(command,cwd=None,check=True,**kwargs):
 command=[str(c) for c in command]
 cmdline=' '.join(shlex.quote(c) for c in command)
 write_log(f'{stamp()} [CMD  ] $ {cmdline}')
 # Capture the output for shareable logs; retain explicit stdout/stderr contracts.
 capture_default=not any(k in kwargs for k in ('stdout','stderr','capture_output'))
 if capture_default:
  kwargs['stdout']=subprocess.PIPE
  kwargs['stderr']=subprocess.STDOUT
  kwargs['text']=True
 elif kwargs.get('stdout') is subprocess.PIPE and 'stderr' not in kwargs:
  kwargs['stderr']=subprocess.PIPE
 result=subprocess.run(command,cwd=cwd,check=False,**kwargs)
 def to_text(value):
  if value is None:return ''
  return value.decode('utf-8','replace') if isinstance(value,bytes) else str(value)
 output='\n'.join(x for x in (to_text(result.stdout),to_text(result.stderr)) if x)
 if output:
  for line in output.splitlines():write_log('    '+line)
 if check and result.returncode:
  status('FAIL',f'Command returned exit code {result.returncode}: {cmdline}')
  if output:
   for line in output.splitlines()[-12:]:
    print('      '+line,flush=True)
  raise subprocess.CalledProcessError(result.returncode,command,output=result.stdout,stderr=result.stderr)
 return result

def check_safe_config():
 if not re.fullmatch(r'[\w.@-]+',REMOTE_HOST): raise RuntimeError('Unsafe SSH host name')
 if not REMOTE_PORT.isdigit() or int(REMOTE_PORT) not in range(1,65536): raise RuntimeError('Invalid SSH port')
 if not REMOTE.startswith('/') or REMOTE in ('/','/var','/var/www') or not VALID_PATH.fullmatch(REMOTE) or '..' in Path(REMOTE).parts: raise RuntimeError('Unsafe deployment path')
 if not PUBLIC.startswith('https://'): raise RuntimeError('Public URL must be HTTPS')

def manifest_archive(zipname,target):
 with zipfile.ZipFile(zipname) as z:
  infos=z.infolist(); names=[i.filename for i in infos if not i.is_dir()]
  if len(infos)>1200 or sum(i.file_size for i in infos)>160*1024*1024: raise RuntimeError('ZIP size/count limits exceeded')
  if len(names)!=len(set(names)) or 'manifest.json' not in names: raise RuntimeError('Duplicate files or missing manifest')
  for entry in infos:
   name=entry.filename
   pp=Path(name)
   if name.startswith('/') or '\\' in name or '..' in pp.parts or any(part in ('','.git','.solvi') for part in pp.parts) or len(pp.parts)<1: raise RuntimeError(f'Unsafe archive path: {name}')
   mode=(entry.external_attr >>16)
   if stat.S_ISLNK(mode): raise RuntimeError(f'Symlink forbidden: {name}')
   if not (name=='manifest.json' or name.startswith('app/')): raise RuntimeError(f'Unexpected archive entry {name}')
  manifest=json.loads(z.read('manifest.json'))
  version=manifest.get('version')
  if not isinstance(version,str) or not VER_RE.fullmatch(version): raise RuntimeError('Invalid semantic version')
  changes=manifest.get('changes')
  if not isinstance(changes,list) or not 1<=len(changes)<=12 or any(not isinstance(x,str) or len(x)>240 or not x.strip() for x in changes): raise RuntimeError('changes must contain 1–12 short bullet items')
  hashes=manifest.get('sha256')
  if not isinstance(hashes,dict) or not hashes: raise RuntimeError('Missing sha256 map')
  archive_files=set(n for n in names if n.startswith('app/'))
  if set('app/'+k for k in hashes)!=archive_files: raise RuntimeError('Manifest file list must exactly match ZIP app files')
  for rel,expected in hashes.items():
   if not isinstance(rel,str) or not isinstance(expected,str) or not SHA_RE.fullmatch(expected): raise RuntimeError('Malformed checksum entry')
   if not VALID_PATH.fullmatch(rel) or rel.startswith('/') or '..' in Path(rel).parts: raise RuntimeError('Unsafe manifest file')
   content=z.read('app/'+rel)
   if hashlib.sha256(content).hexdigest()!=expected: raise RuntimeError('SHA-256 mismatch: '+rel)
   dest=target/rel; dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(content)
  if any(not (target/p).is_file() for p in REQUIRED): raise RuntimeError('Archive is not a complete app release')
  return manifest

def current_versions():
 try:
  obj=json.loads((ROOT/'releases.json').read_text())
  return obj.get('releases',[])
 except (ValueError,OSError):return []
def version_num(s): return tuple(int(x) for x in s.split('.'))
def check_version(ver):
 releases=current_versions()
 if releases and version_num(ver)<=max(version_num(r['version']) for r in releases): raise RuntimeError(f'version {ver} must exceed last published version')
 if not releases and (ROOT/'package.json').exists():
  old=json.loads((ROOT/'package.json').read_text()).get('version','0.0.0')
  if VER_RE.fullmatch(old) and version_num(ver)<=version_num(old): raise RuntimeError(f'version must exceed installed {old}')

def prep_vendor(stage):
 # Reuse the previously tested local vendor tree on later full-code updates.
 if (ROOT/'vendor').is_dir() and not (stage/'vendor').exists():
  shutil.copytree(ROOT/'vendor',stage/'vendor',symlinks=False)
 missing=[p for p in VENDOR_REQUIRED if not (stage/p).is_file()]
 html=(stage/'index.html').read_text()
 uses_cdn=('cdn.jsdelivr.net/npm/three@' in html)
 if missing or uses_cdn:
  log('Preparing local Three.js and Draco dependencies (first run requires internet).')
  run(['node','download-three.mjs'],cwd=stage)
 for name in VENDOR_REQUIRED:
  if not (stage/name).is_file() or not (stage/name).stat().st_size: raise RuntimeError('Missing vendor asset: '+name)
 html=(stage/'index.html').read_text()
 if '"three":"./vendor/three.module.js"' not in html: raise RuntimeError('Three.js local import map missing')
 if (stage/'download-xr-profiles.mjs').exists():
  run(['node','download-xr-profiles.mjs'],cwd=stage,check=False)

def build_release(stage,manifest):
 releases=current_versions()
 now=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
 item={'version':manifest['version'],'publishedAt':now,'changes':manifest['changes']}
 all_releases=[item]+[r for r in releases if r.get('version')!=manifest['version']]
 (stage/'releases.json').write_text(json.dumps({'currentVersion':manifest['version'],'releases':all_releases},ensure_ascii=False,indent=2)+'\n')
 text=(stage/'index.html').read_text()
 if 'id="solviVersion"' not in text or 'dev-overlay.js' not in text: raise RuntimeError('Version indicator or development overlay missing')
 if not re.search(r'<span class="solvi-version" id="solviVersion">v'+re.escape(manifest['version'])+r'</span>',text):raise RuntimeError('Version indicator differs from manifest')
 pkg=json.loads((stage/'package.json').read_text())
 if pkg['version']!=manifest['version']: raise RuntimeError('package.json version differs from manifest')

def test_local(stage):
 log('Running syntax, logic and HTTP smoke tests.')
 for p in sorted((stage/'js').rglob('*.js')): run(['node','--check',str(p)],cwd=stage)
 tests=sorted((stage/'tests').glob('*.test.js'))
 if not tests:raise RuntimeError('No tests found')
 run(['node','--test']+[str(p) for p in tests],cwd=stage)
 for p in REQUIRED+VENDOR_REQUIRED+['releases.json']:
  if not (stage/p).is_file() or (stage/p).stat().st_size==0: raise RuntimeError('Missing/empty: '+p)
 html=(stage/'index.html').read_text()
 if './js/main.js' not in html or './styles.css' not in html: raise RuntimeError('Incorrect HTML paths')
 class QuietHandler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(stage),**kwargs)
  def log_message(self,*args):pass
 handler=QuietHandler
 with http.server.ThreadingHTTPServer(('127.0.0.1',0),handler) as srv:
  thread=threading.Thread(target=srv.serve_forever,daemon=True);thread.start()
  url=f'http://127.0.0.1:{srv.server_port}/'
  try:
   for rel in ['','js/main.js','js/scene.js','js/dev-overlay.js','styles.css','releases.json','assets/anthropomorphiccat3dmodel.glb','vendor/three.module.js','vendor/addons/loaders/GLTFLoader.js','vendor/draco/draco_decoder.wasm']:
    with urllib.request.urlopen(url+rel,timeout=12) as resp:
     if resp.status!=200 or not resp.read(): raise RuntimeError('Bad local HTTP: '+rel)
  finally:srv.shutdown();thread.join(timeout=4)

def git_preflight(stage):
 run(['git','rev-parse','--is-inside-work-tree'],cwd=ROOT,stdout=subprocess.DEVNULL)
 if not (ROOT/'.git').exists(): raise RuntimeError('Run from the cloned Git repo root')
 run(['git','var','GIT_AUTHOR_IDENT'],cwd=ROOT,stdout=subprocess.DEVNULL)
 status=run(['git','status','--porcelain','--untracked-files=no'],cwd=ROOT,stdout=subprocess.PIPE,text=True).stdout
 # The watcher itself can be updated between releases and should be committed with the next release.
 unrelated=[line for line in status.splitlines() if line[3:]!='solvi-watch.sh']
 if unrelated:raise RuntimeError('Tracked Git files are modified. Commit/stash changes before automatic deployment:\n'+'\n'.join(unrelated))
 # Only overwrite files explicitly provided by this full release. Never mutate arbitrary repository files.
 for p in stage.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(stage)
  existing=ROOT/rel
  if existing.is_symlink():raise RuntimeError(f'Refusing to overwrite local symlink {rel}')

def github_cmd(*args):
 # Always communicate with the exact project repository using SSH (not HTTPS).
 return ['git','-c','core.sshCommand=ssh -o BatchMode=yes -o ConnectTimeout=12',*args]

def github_preflight():
 branch=run(['git','branch','--show-current'],cwd=ROOT,stdout=subprocess.PIPE,text=True).stdout.strip()
 if branch!=GITHUB_BRANCH:
  raise RuntimeError(f'Expected local branch {GITHUB_BRANCH!r}; current branch is {branch!r}. No deployment performed.')
 origin=run(['git','remote','get-url','origin'],cwd=ROOT,check=False,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 if origin.returncode==0:
  accepted={GITHUB_SSH,'https://github.com/sylwesterdigital/solvi.git',
            'ssh://git@github.com/sylwesterdigital/solvi.git',
            'https://github.com/sylwesterdigital/solvi',
            'git@github.com:sylwesterdigital/solvi'}
  if origin.stdout.strip() not in accepted:
   raise RuntimeError('Git origin points to an unexpected repository: '+origin.stdout.strip())
 log('Checking GitHub SSH connectivity and main branch (no force push).')
 # git ls-remote verifies SSH authentication without changing local Git config.
 cmd=github_cmd('ls-remote',GITHUB_SSH,'refs/heads/'+GITHUB_BRANCH)
 result=run(cmd,cwd=ROOT,stdout=subprocess.PIPE,text=True)
 tip=result.stdout.strip().split('\t')[0] if result.stdout.strip() else None
 if tip:
  # Fetch is non-destructive; check that the remote branch is an ancestor of local HEAD.
  run(github_cmd('fetch','--no-tags',GITHUB_SSH,'refs/heads/'+GITHUB_BRANCH),cwd=ROOT)
  relation=run(['git','merge-base','--is-ancestor','FETCH_HEAD','HEAD'],cwd=ROOT,check=False)
  if relation.returncode!=0:
   raise RuntimeError('GitHub main has commits not present locally. Run git pull --ff-only first. No deployment performed.')

def github_push():
 origin=run(['git','remote','get-url','origin'],cwd=ROOT,check=False,stdout=subprocess.PIPE,text=True)
 if origin.returncode:
  run(['git','remote','add','origin',GITHUB_SSH],cwd=ROOT)
 elif origin.stdout.strip()!=GITHUB_SSH:
  run(['git','remote','set-url','origin',GITHUB_SSH],cwd=ROOT)
 # No --force; rejection stops publication before modifying the website.
 log('Pushing committed release to GitHub using SSH.')
 run(github_cmd('push','-u','origin',GITHUB_BRANCH),cwd=ROOT)
 expected=run(['git','rev-parse','HEAD'],cwd=ROOT,stdout=subprocess.PIPE,text=True).stdout.strip()
 actual=run(github_cmd('ls-remote',GITHUB_SSH,'refs/heads/'+GITHUB_BRANCH),cwd=ROOT,stdout=subprocess.PIPE,text=True).stdout.strip()
 if not actual.startswith(expected+'\t'):
  raise RuntimeError('GitHub verification failed: main does not match the new local commit. Website unchanged.')
 log('Verified GitHub main: '+expected[:12])

def safe_ssh(cmd):return run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','-p',REMOTE_PORT,REMOTE_HOST,cmd])
def ssh_cmd(cmd):return ['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','-p',REMOTE_PORT,REMOTE_HOST,cmd]
def quote(x):return shlex.quote(str(x))
def deploy_remote(stage,version):
 check_safe_config()
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+str(os.getpid())
 parent=str(Path(REMOTE).parent)
 deployname='solvi-'+str(version).replace('.','-')+'-'+stamp
 remote_stage=f'{parent}/.solvi-stage-{deployname}'
 backup=f'{parent}/.solvi-backups/{deployname}'
 log(f'Staging release via SSH: {REMOTE_HOST}:{remote_stage}')
 safe_ssh(f'mkdir -p {quote(remote_stage)}')
 # This staging directory is private to this release; trailing slash intentionally copies CONTENTS.
 run(['rsync','-az','--no-perms','--no-owner','--no-group','-e',f'ssh -p {REMOTE_PORT}',str(stage)+'/',f'{REMOTE_HOST}:{remote_stage}/'])
 qdest=quote(REMOTE); qstage=quote(remote_stage);qbackup=quote(backup)
 verify=' && '.join(f'test -s {quote(remote_stage+"/"+p)}' for p in REQUIRED+VENDOR_REQUIRED+['releases.json'])
 safe_ssh(verify)
 log('Backing up current public files before publishing.')
 backup_cmd=f'''set -eu; mkdir -p {qdest} {qbackup}; for item in index.html styles.css js assets vendor releases.json; do if [ -e {qdest}/"$item" ]; then cp -a {qdest}/"$item" {qbackup}/; fi; done'''
 safe_ssh(backup_cmd)
 try:
  publish=f'''set -eu
mkdir -p {qdest}/js {qdest}/assets {qdest}/vendor
rsync -a --delete {qstage}/js/ {qdest}/js/
rsync -a --delete {qstage}/assets/ {qdest}/assets/
rsync -a --delete {qstage}/vendor/ {qdest}/vendor/
cp {qstage}/styles.css {qdest}/styles.css.tmp && mv -f {qdest}/styles.css.tmp {qdest}/styles.css
cp {qstage}/releases.json {qdest}/releases.json.tmp && mv -f {qdest}/releases.json.tmp {qdest}/releases.json
cp {qstage}/index.html {qdest}/index.html.tmp && mv -f {qdest}/index.html.tmp {qdest}/index.html
'''
  log('Publishing new release to /labs/solvi/. Previous numbered snapshots are not removed.')
  safe_ssh(publish)
  public_smoke(version)
  log(f'Deployed and HTTPS verified: {PUBLIC}')
 except Exception:
  log('DEPLOY FAILED — restoring remote backup.')
  rollback=f'''set -eu; for item in index.html styles.css js assets vendor releases.json; do rm -rf {qdest}/"$item"; if [ -e {qbackup}/"$item" ]; then cp -a {qbackup}/"$item" {qdest}/; fi; done'''
  try:safe_ssh(rollback)
  except Exception as e:log('URGENT: remote rollback failed: '+str(e))
  raise
 finally:
  safe_ssh(f'rm -rf {qstage}')
 return backup

def public_smoke(version):
 # Test actual public URL; deployment is rejected if the web root is not mapped as expected.
 for rel in ['', 'releases.json','styles.css','js/main.js','js/scene.js','js/dev-overlay.js','vendor/three.module.js','vendor/addons/loaders/GLTFLoader.js','assets/anthropomorphiccat3dmodel.glb']:
  url=PUBLIC+rel+'?solvi='+version
  command=['curl','--fail','--silent','--show-error','--location','--max-time','22','--connect-timeout','7','--output','/dev/null','--write-out','%{http_code}',url]
  result=run(command,stdout=subprocess.PIPE,text=True)
  if result.stdout.strip()!='200':raise RuntimeError(f'Public HTTPS returned {result.stdout} at {url}')
 with urllib.request.urlopen(PUBLIC+'releases.json?solvi='+version,timeout=15) as resp:
  obj=json.load(resp)
 if obj.get('currentVersion')!=version:raise RuntimeError('Public release version does not match')
 with urllib.request.urlopen(PUBLIC+'?solvi='+version,timeout=15) as resp:
  page=resp.read().decode('utf-8')
 if 'id="solviVersion">v'+version+'</span>' not in page:raise RuntimeError('Public HTML has stale version')

def persist_repo(stage,manifest):
 # Preserve unrelated repo files, and append ignore rules for machine state.
 ignore=ROOT/'.gitignore'; lines=ignore.read_text() if ignore.exists() else ''
 for entry in ('updates/','.solvi/','.certs/','node_modules/'):
  if entry not in lines.splitlines():lines+='\n'+entry
 ignore.write_text(lines)
 added=[]
 for path in stage.rglob('*'):
  if not path.is_file():continue
  rel=path.relative_to(stage)
  if rel in (Path('.gitignore'),Path('solvi-watch.sh')): continue  # retain repository ignore rules and installed watcher
  dest=ROOT/rel;dest.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(path,dest);added.append(str(rel))
 # Keep watcher script itself in the repo's commit to establish a reproducible workflow.
 if (ROOT/'solvi-watch.sh').exists():added.append('solvi-watch.sh')
 added.append('.gitignore')
 run(['git','add','--']+added,cwd=ROOT)
 run(['git','commit','-m',f"solvi: release v{manifest['version']}"],cwd=ROOT)
 # Push the committed release via SSH; failure must prevent website publication.
 github_push()

def process(zipname):
 with tempfile.TemporaryDirectory(prefix='candidate-',dir=STATE) as tmp:
  stage=Path(tmp)/'site';stage.mkdir()
  manifest=step('Validate ZIP manifest and SHA-256',lambda: manifest_archive(zipname,stage))
  version=manifest['version']
  status('INFO',f'Release: v{version} | {REMOTE_HOST}:{REMOTE} | GitHub {GITHUB_BRANCH}')
  step('Check version and build release history',lambda: (check_version(version),build_release(stage,manifest)))
  step('Prepare Three.js / Draco / XR assets',lambda: prep_vendor(stage))
  step('JavaScript syntax, unit tests and local HTTP',lambda: test_local(stage))
  step('Local Git and GitHub SSH preflight',lambda: (git_preflight(stage),github_preflight()))
  if DRY:
   status('DONE',f'DRY RUN PASSED — v{version}; no files changed or deployed')
   return
  step('Commit and push release to GitHub (SSH)',lambda: persist_repo(stage,manifest))
  try:
   backup=step('Deploy via SSH + backup + public HTTPS verification',lambda: deploy_remote(stage,version))
  except Exception:
   status('WARN',f'GitHub already contains v{version}; server rollback was attempted. Check the log.')
   raise
  status('DONE',f'DEPLOYMENT SUCCESS — v{version} — {PUBLIC}')
  log('Remote backup: '+backup)

def main():
 if '--last-log' in ARGS:
  return last_log()
 check_safe_config()
 if not ROOT.is_dir() or not (ROOT/'.git').exists():raise RuntimeError(f'Not a Git repository root: {ROOT}')
 UPDATES.mkdir(exist_ok=True);STATE.mkdir(exist_ok=True)
 for name in ('processed','failed'): (UPDATES/name).mkdir(exist_ok=True)
 lock=open(STATE/'watch.lock','w')
 try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:raise RuntimeError('Another solvi-watch instance is already running.')
 status('START','SOLVI WATCHER READY — monitoring '+str(UPDATES))
 log('SSH: '+REMOTE_HOST+':'+REMOTE_PORT+' | GitHub: '+GITHUB_SSH+' | URL: '+PUBLIC)
 failures=0
 while True:
  pending=sorted(UPDATES.glob('*.zip'),key=lambda p: tuple(int(x) for x in re.findall(r'\d+',p.stem)[-3:]) if len(re.findall(r'\d+',p.stem))>=3 else (0,0,0))
  for item in pending:
   if WATCH and time.time()-item.stat().st_mtime<3: continue
   begin_release_log(item)
   try:
    process(item)
    if not DRY:
     destination=UPDATES/'processed'/item.name
     if destination.exists(): destination=UPDATES/'processed'/(item.stem+'-'+str(int(time.time()))+'.zip')
     item.rename(destination)
   except Exception as e:
    msg=''.join(traceback.format_exception(e))
    status('FAIL','DEPLOYMENT FAILED — '+item.name+' — '+str(e))
    write_log(msg.rstrip())
    failures+=1
    if not DRY:
     failed=UPDATES/'failed'/item.name
     if failed.exists():failed=UPDATES/'failed'/(item.stem+'-'+str(int(time.time()))+'.zip')
     failed.write_bytes(item.read_bytes());item.unlink()
     (failed.parent/(failed.name+'.error.log')).write_text(msg+'\nDetailed log: '+str(LOG_FILE)+'\n')
   finally:
    if LOG_FILE is not None:
     status('INFO','Share this log: '+str(LOG_FILE))
     globals()['LOG_FILE']=None
  if not WATCH:break
  time.sleep(3)
 if failures:sys.exit(1)
 return 0

try:sys.exit(main())
except KeyboardInterrupt:status('WARN','Watcher stopped by user.')
except Exception as e:status('FAIL',f'Watcher error: {e}');sys.exit(1)

SOLVI_PYTHON
