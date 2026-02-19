"""PCM audio resampling utilities for voice adapters."""

import numpy as np


def resample_pcm(data: bytes, from_rate: int, to_rate: int) -> bytes:
    """
    Resample 16-bit signed PCM audio between sample rates.

    Uses linear interpolation — sufficient for voice-quality audio.
    """
    if from_rate == to_rate:
        return data

    samples = np.frombuffer(data, dtype=np.int16).astype(np.float32)
    if len(samples) == 0:
        return data

    ratio = to_rate / from_rate
    new_length = int(len(samples) * ratio)
    indices = np.linspace(0, len(samples) - 1, new_length)
    resampled = np.interp(indices, np.arange(len(samples)), samples)

    return resampled.astype(np.int16).tobytes()
