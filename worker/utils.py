import hashlib
from time import perf_counter

def sha256_file(path: str, buf_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(buf_size):
            h.update(chunk)
    return h.hexdigest()

class Timer:
    def __enter__(self):
        self.t0 = perf_counter(); return self
    def __exit__(self, *exc):
        self.ms = (perf_counter() - self.t0) * 1000
