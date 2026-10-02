/** Installed only in the runner-owned page, before application audio contexts exist. */
export function installLocalCapture() {
  const connect = AudioNode.prototype.connect
  const disconnect = AudioNode.prototype.disconnect
  const decode = BaseAudioContext.prototype.decodeAudioData
  const mixer = new AudioContext({ sampleRate: 48000 })
  const mixed = mixer.createMediaStreamDestination()
  const buses = new Map()
  const edges = []
  const media = new Map()
  const chunks = []
  const events = []
  const failures = []
  let phase = 'idle'
  let specification
  let recorder
  let recordedStream
  let stopped
  let stopResolve
  let animation
  let startedAt
  let videoFrames = 0
  let canvasFrames = 0
  let renderedFrames = 0
  let lastVisual
  let cleaned = false
  let intro
  let warmupBlob
  let warmupResolve
  let warmupReject
  const event = (kind, details = {}) => {
    if (events.length >= 2000) throw new Error('capture event budget exhausted')
    events.push({ kind, atMs: performance.now(), ...details })
  }
  const fail = (error) => {
    if (!failures.length) console.error('[local-capture]', String(error))
    if (failures.length < 20) failures.push(String(error))
    if (recorder?.state === 'recording') recorder.stop()
    phase = 'failed'
    warmupReject?.(new Error(String(error)))
  }
  BaseAudioContext.prototype.decodeAudioData = function (...args) {
    try {
      const result = decode.apply(this, args)
      // Observe rejection without replacing the application's Promise or callbacks.
      void result.then(undefined, (error) => fail(`audio decode failed: ${error}`))
      return result
    } catch (error) {
      fail(`audio decode failed: ${error}`)
      throw error
    }
  }
  const connectTap = (node, output) => {
    let bus = buses.get(node.context)
    if (!bus) {
      const destination = node.context.createMediaStreamDestination()
      const source = mixer.createMediaStreamSource(destination.stream)
      connect.call(source, mixed)
      bus = { destination, source }
      buses.set(node.context, bus)
    }
    if (edges.some((edge) => edge.node === node && edge.output === output)) return
    connect.call(node, bus.destination, output, 0)
    edges.push({ node, output, destination: bus.destination })
  }
  AudioNode.prototype.connect = function (...args) {
    const result = connect.apply(this, args)
    if (this.context !== mixer && args[0] === this.context.destination) {
      try {
        connectTap(this, args[1] ?? 0)
      } catch (error) {
        fail(error)
      }
    }
    return result
  }
  AudioNode.prototype.disconnect = function (...args) {
    // Native rejection must preserve both original and recording edges.
    const result = disconnect.apply(this, args)
    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i]
      if (edge.node !== this) continue
      const all = args.length === 0
      const output = typeof args[0] === 'number' && args[0] === edge.output
      const destination =
        args[0] === this.context.destination && (args[1] === undefined || args[1] === edge.output)
      if (all || output || destination) {
        if (destination) {
          try {
            disconnect.call(this, edge.destination, edge.output, 0)
          } catch (error) {
            fail(error)
          }
        }
        edges.splice(i, 1)
      }
    }
    return result
  }
  const onGesture = (input) => {
    if (intro && input?.type === 'keydown' && input.code === 'Enter' && !intro.inputAt) {
      if (!intro.readyAt) fail('story input arrived before verified encoder readiness')
      else {
        intro.inputAt = performance.now()
        event('story-start-input', { code: input.code })
      }
    }
    if (mixer.state === 'suspended') void mixer.resume().catch(fail)
  }
  window.addEventListener('keydown', onGesture, true)
  window.addEventListener('pointerdown', onGesture, true)
  const visible = (element) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0
    )
  }
  const tapVideo = (video) => {
    if (media.has(video)) return
    const stream = video.captureStream()
    const tap = { stream, source: null, gain: null, observedAt: performance.now() }
    const volume = () => {
      if (tap.gain) tap.gain.gain.value = video.muted ? 0 : video.volume
    }
    const attach = () => {
      try {
        const tracks = stream.getAudioTracks()
        if (tracks.length > 1) throw new Error('multiple video audio tracks')
        if (!tracks.length || tap.source) return
        tap.source = mixer.createMediaStreamSource(new MediaStream(tracks))
        tap.gain = mixer.createGain()
        volume()
        connect.call(tap.source, tap.gain)
        connect.call(tap.gain, mixed)
        event('video-audio', { path: new URL(video.src, location.href).pathname })
      } catch (error) {
        fail(error)
      }
    }
    const error = () => fail('HTMLVideo load/decode failed')
    const playing = () => {
      if (!tap.source) fail('playing video has no captured audio track')
      if (intro) event('intro-playing', { mediaTime: video.currentTime })
    }
    const play = () => {
      if (!intro) return
      if (!intro.readyAt || !intro.inputAt) fail('intro playback preceded verified story input')
      intro.playAt = performance.now()
      event('intro-play', { mediaTime: video.currentTime })
    }
    Object.assign(tap, { attach, volume, error, playing, play })
    media.set(video, tap)
    stream.addEventListener('addtrack', attach)
    video.addEventListener('volumechange', volume)
    video.addEventListener('error', error)
    video.addEventListener('playing', playing)
    if (intro) {
      video.addEventListener('play', play)
      tap.frameCallback = video.requestVideoFrameCallback((now, metadata) => {
        intro.firstPresentedFrame = {
          atMs: now,
          mediaTime: metadata.mediaTime,
          presentedFrames: metadata.presentedFrames,
        }
        event('intro-first-presented-frame', intro.firstPresentedFrame)
      })
    }
    attach()
  }
  const observeVideos = () => {
    if (!specification || cleaned) return
    for (const video of document.querySelectorAll('video')) {
      const url = new URL(video.currentSrc || video.src, location.href)
      if (!visible(video)) continue
      if (intro && !intro.readyAt)
        throw new Error('intro appeared before verified encoder readiness')
      if (url.origin !== location.origin || url.pathname !== specification.videoPath)
        throw new Error(`unexpected video: ${url.pathname}`)
      const style = getComputedStyle(video)
      const rect = video.getBoundingClientRect()
      if (
        style.position !== 'fixed' ||
        style.objectFit !== 'contain' ||
        rect.left !== 0 ||
        rect.top !== 0 ||
        Math.abs(rect.width - innerWidth) > 1 ||
        Math.abs(rect.height - innerHeight) > 1
      )
        throw new Error('unexpected video layout')
      tapVideo(video)
    }
  }
  const observer = new MutationObserver(() => {
    try {
      observeVideos()
    } catch (error) {
      fail(error)
    }
  })
  observer.observe(document, { childList: true, subtree: true })
  const output = document.createElement('canvas')
  output.width = 1280
  output.height = 800
  const drawing = output.getContext('2d')
  drawing.imageSmoothingEnabled = false
  const unobstructed = (element) => {
    const rect = element.getBoundingClientRect()
    const points = [
      [0.1, 0.1],
      [0.5, 0.5],
      [0.9, 0.9],
      [0.9, 0.1],
      [0.1, 0.9],
    ].map(([x, y]) => [rect.left + rect.width * x, rect.top + rect.height * y])
    // Include intersecting DOM boxes: small overlays between the five sample points
    // must not be silently omitted by canvas-only recording.
    for (const candidate of document.querySelectorAll('body *')) {
      if (candidate === element || candidate.contains(element) || !visible(candidate)) continue
      if (element.tagName === 'VIDEO' && candidate.id === 'screen') continue
      const box = candidate.getBoundingClientRect()
      const left = Math.max(rect.left, box.left),
        right = Math.min(rect.right, box.right)
      const top = Math.max(rect.top, box.top),
        bottom = Math.min(rect.bottom, box.bottom)
      if (left >= right || top >= bottom) continue
      let opaque = true
      for (let parent = candidate; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0
        )
          opaque = false
      }
      if (!opaque) continue
      const style = getComputedStyle(candidate)
      if (style.pointerEvents === 'none' && ['fixed', 'absolute'].includes(style.position))
        throw new Error(`unrecorded non-interactive overlay: ${candidate.tagName}`)
      points.push([(left + right) / 2, (top + bottom) / 2])
    }
    // No coordinate input is used; these are visibility observations only.
    for (const [x, y] of points) {
      const top = document.elementsFromPoint(x, y).find((candidate) => visible(candidate))
      if (top !== element)
        throw new Error(`capture surface obscured by ${top?.tagName ?? 'nothing'}`)
    }
  }
  const startRecorder = () => {
    const mimeType = 'video/webm;codecs=vp9,opus'
    if (!MediaRecorder.isTypeSupported(mimeType))
      throw new Error('VP9/Opus MediaRecorder unavailable')
    recordedStream = output.captureStream(60)
    recordedStream.addTrack(mixed.stream.getAudioTracks()[0])
    recorder = new MediaRecorder(recordedStream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 192_000,
    })
    stopped = new Promise((resolve) => {
      stopResolve = resolve
    })
    recorder.ondataavailable = (value) => {
      if (value.data.size) chunks.push(value.data)
      if (intro && !warmupBlob && value.data.size) {
        warmupBlob = value.data
        if (intro.encoderStartedAt) warmupResolve?.()
      }
      if (chunks.reduce((sum, chunk) => sum + chunk.size, 0) > 512 * 1024 * 1024)
        fail('capture byte budget exceeded')
    }
    recorder.onerror = (value) => fail(value.error ?? 'MediaRecorder error')
    recorder.onstop = () => stopResolve()
    if (intro)
      recorder.onstart = () => {
        intro.encoderStartedAt = performance.now()
        event('encoder-started')
        if (warmupBlob) warmupResolve?.()
      }
    recorder.start(1000)
    startedAt = performance.now()
    phase = 'recording'
    event('recording-start', { canvas: '#screen', width: output.width, height: output.height })
  }
  const paint = () => {
    try {
      if (!specification || cleaned || phase === 'failed') return
      observeVideos()
      const canvases = document.querySelectorAll('canvas#screen')
      if (canvases.length !== 1) throw new Error('expected one canvas#screen')
      const canvas = canvases[0]
      const videos = [...document.querySelectorAll('video')].filter(visible)
      if (videos.length > 1) throw new Error('multiple visible videos')
      const video = videos[0]
      // Intro capture starts on the real title canvas. Normal story input is not
      // released until a native encoded video frame has been verified by the runner.
      const visual = video ?? canvas
      const drawBeganAt = performance.now()
      const videoTimeBeforeDraw = video?.currentTime
      unobstructed(visual)
      drawing.fillStyle = '#000'
      drawing.fillRect(0, 0, output.width, output.height)
      if (!video || video.readyState >= 2) {
        const width = video ? video.videoWidth : canvas.width
        const height = video ? video.videoHeight : canvas.height
        if (!width || !height) throw new Error('empty capture surface')
        const scale = Math.min(output.width / width, output.height / height)
        drawing.drawImage(
          visual,
          (output.width - width * scale) / 2,
          (output.height - height * scale) / 2,
          width * scale,
          height * scale,
        )
        if (intro && video && !intro.firstDraw) {
          intro.firstDraw = {
            atMs: performance.now(),
            mediaTime: videoTimeBeforeDraw,
            mediaTimeAfter: video.currentTime,
            durationMs: performance.now() - drawBeganAt,
          }
          event('intro-first-draw', intro.firstDraw)
        }
      } else if (performance.now() - media.get(video).observedAt > 5000) {
        throw new Error('video failed to decode a frame within capture budget')
      }
      // The known native video layer is black before decode, never the stale canvas below it.
      // Reject tainted output before publication; intro checks at preparation and
      // finalization avoid a synchronous readback on its first video frame.
      if (visual !== lastVisual) {
        if (!intro || phase === 'armed') drawing.getImageData(0, 0, 1, 1)
        event('visual-source', { surface: video ? 'video' : 'canvas', frame: renderedFrames })
        lastVisual = visual
      }
      if (phase === 'armed') startRecorder()
      if (video) videoFrames++
      else canvasFrames++
      renderedFrames++
      animation = requestAnimationFrame(paint)
    } catch (error) {
      fail(error)
    }
  }
  const cleanup = async () => {
    if (cleaned) return
    cleaned = true
    cancelAnimationFrame(animation)
    observer.disconnect()
    window.removeEventListener('keydown', onGesture, true)
    window.removeEventListener('pointerdown', onGesture, true)
    AudioNode.prototype.connect = connect
    AudioNode.prototype.disconnect = disconnect
    BaseAudioContext.prototype.decodeAudioData = decode
    for (const edge of edges) {
      try {
        disconnect.call(edge.node, edge.destination, edge.output, 0)
      } catch (error) {
        failures.push(`tap cleanup: ${error}`)
      }
    }
    for (const { source, destination } of buses.values()) {
      disconnect.call(source)
      for (const track of destination.stream.getTracks()) track.stop()
    }
    for (const [video, tap] of media) {
      tap.stream.removeEventListener('addtrack', tap.attach)
      video.removeEventListener('volumechange', tap.volume)
      video.removeEventListener('error', tap.error)
      video.removeEventListener('playing', tap.playing)
      video.removeEventListener('play', tap.play)
      if (tap.frameCallback !== undefined) video.cancelVideoFrameCallback(tap.frameCallback)
      if (tap.source) disconnect.call(tap.source)
      if (tap.gain) disconnect.call(tap.gain)
      for (const track of tap.stream.getTracks()) track.stop()
    }
    for (const track of recordedStream?.getTracks() ?? []) track.stop()
    for (const track of mixed.stream.getTracks()) track.stop()
    await mixer.close()
  }
  const state = () => ({
    phase,
    failures: [...failures],
    events: [...events],
    startedAt,
    elapsedMs: startedAt === undefined ? 0 : performance.now() - startedAt,
    canvasFrames,
    videoFrames,
    renderedFrames,
    audioContexts: buses.size,
    ...(intro ? { intro: structuredClone(intro) } : {}),
    cleanup: {
      complete: cleaned,
      prototypesRestored:
        AudioNode.prototype.connect === connect &&
        AudioNode.prototype.disconnect === disconnect &&
        BaseAudioContext.prototype.decodeAudioData === decode,
      mixerClosed: mixer.state === 'closed',
      tracksEnded:
        !recordedStream ||
        recordedStream.getTracks().every((track) => track.readyState === 'ended'),
    },
  })
  window.__localCapture = {
    arm(value) {
      if (phase !== 'idle' || failures.length) throw new Error('capture cannot be armed')
      specification = value
      if (value.startOnVideo) intro = {}
      phase = 'armed'
      onGesture()
      event('armed', value)
      paint()
      return state()
    },
    state,
    async warmup() {
      if (!intro || phase !== 'recording' || failures.length)
        throw new Error('intro warmup unavailable')
      let timer
      try {
        if (!warmupBlob || !intro.encoderStartedAt)
          await Promise.race([
            new Promise((resolve, reject) => {
              warmupResolve = resolve
              warmupReject = reject
            }),
            new Promise((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('encoder warmup timed out before story input')),
                5000,
              )
            }),
          ])
        if (failures.length) throw new Error(failures.join('\n'))
        if (!warmupBlob || warmupBlob.size > 5 * 1024 * 1024)
          throw new Error('intro warmup byte budget')
        const bytes = new Uint8Array(await warmupBlob.arrayBuffer())
        let text = ''
        for (let i = 0; i < bytes.length; i += 16384)
          text += String.fromCharCode(...bytes.subarray(i, i + 16384))
        return btoa(text)
      } finally {
        clearTimeout(timer)
        warmupResolve = undefined
        warmupReject = undefined
      }
    },
    ready(proof) {
      if (
        !intro ||
        intro.readyAt ||
        intro.inputAt ||
        !intro.encoderStartedAt ||
        !warmupBlob ||
        failures.length
      )
        throw new Error('intro readiness cannot be acknowledged')
      if (
        !Number.isFinite(proof.cutSeconds) ||
        proof.cutSeconds < 0 ||
        !Number.isInteger(proof.frames) ||
        proof.frames < 1
      )
        throw new Error('missing decoded warmup frame proof')
      intro.readyAt = performance.now()
      intro.proof = proof
      event('encoder-ready', { ...proof })
      return state()
    },
    async finish(abort = false) {
      if (abort) fail('capture aborted')
      if (!recorder && !abort) fail('capture never started')
      if (recorder?.state === 'recording') recorder.stop()
      if (stopped) {
        let timer
        try {
          await Promise.race([
            stopped,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('MediaRecorder stop timeout')), 5000)
            }),
          ])
        } catch (error) {
          fail(error)
        } finally {
          clearTimeout(timer)
        }
      }
      const durationMs = startedAt === undefined ? 0 : performance.now() - startedAt
      if (intro && !abort) {
        try {
          drawing.getImageData(0, 0, 1, 1)
        } catch (error) {
          fail(`capture origin-clean check failed: ${error}`)
        }
      }
      await cleanup()
      phase = failures.length ? 'failed' : 'stopped'
      const result = { ...state(), durationMs }
      if (!failures.length) {
        if (!chunks.length) throw new Error('empty MediaRecorder output')
        window.__localCaptureBlob = new Blob(chunks, { type: recorder.mimeType })
        result.bytes = window.__localCaptureBlob.size
      }
      return result
    },
    async chunk(offset, length) {
      if (phase !== 'stopped' || !window.__localCaptureBlob) throw new Error('no completed capture')
      const bytes = new Uint8Array(
        await window.__localCaptureBlob.slice(offset, offset + length).arrayBuffer(),
      )
      let text = ''
      for (let i = 0; i < bytes.length; i += 16384)
        text += String.fromCharCode(...bytes.subarray(i, i + 16384))
      return btoa(text)
    },
  }
}
