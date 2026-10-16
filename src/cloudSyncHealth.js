// A successful read of another document cannot acknowledge a failed record write.
export function cloudSyncHealth(previous, patch) {
  const failures={...(previous.recordWriteErrors||{})};
  const record=path=>['memory/taraCallLog','memory/hourlyRecord'].includes(path);
  if(patch.state==='error'&&record(patch.lastError?.path))failures[patch.lastError.path]=patch.lastError;
  if(patch.state==='ok'&&record(patch.path))delete failures[patch.path];
  const next={...previous,...patch,recordWriteErrors:failures};
  if(Object.keys(failures).length){
    next.state='error';
    next.lastError=Object.values(failures).sort((a,b)=>b.at-a.at)[0];
  }
  return next;
}
