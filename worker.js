importScripts('./vendor/qpdf/qpdf.js');

self.onmessage = async ({ data: { bytes, password, name } }) => {
  let stderr = '';
  try {
    self.postMessage({ status: 'Loading engine…' });
    const qpdf = await Module({
      locateFile: () => new URL('./vendor/qpdf/qpdf.wasm', self.location.href).href,
      noInitialRun: true,
      printErr: (s) => { stderr += s + '\n'; console.error('[qpdf]', s); },
    });
    self.postMessage({ status: 'Running qpdf…' });
    qpdf.FS.writeFile('/in.pdf', bytes);
    const args = ['--decrypt', '/in.pdf', '/out.pdf'];
    if (password) args.unshift('--password', password);
    console.log('[qpdf] callMain args:', args);
    const code = qpdf.callMain(args);
    console.log('[qpdf] exit code:', code, 'stderr:', stderr);
    if (code !== 0) {
      self.postMessage({ ok: false, code, message: stderr.trim() || `qpdf exited with code ${code}` });
      return;
    }
    const out = qpdf.FS.readFile('/out.pdf');
    self.postMessage({ ok: true, bytes: out, name }, [out.buffer]);
  } catch (err) {
    console.error('[qpdf] caught:', err);
    const code = (err && err.status) ?? -1;
    const message = stderr.trim() || err?.message || String(err);
    self.postMessage({ ok: false, code, message });
  }
};
