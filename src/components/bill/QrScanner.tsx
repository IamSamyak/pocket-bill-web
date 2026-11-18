
import { useEffect, useId, useRef, useState } from 'react'
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'
import { Camera, CameraOff, X, RefreshCw } from 'lucide-react'

type QrScannerProps = {
  onScan: (value: string) => void
  onClose: () => void
}

type CameraDevice = {
  id: string
  label: string
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  // React generates a stable ID without impure functions.
  const readerId = `qr-reader-${useId().replace(/:/g, '')}`

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const runningRef = useRef(false)
  const lastScanAtRef = useRef(0)
  const onScanRef = useRef(onScan)
  const scanAudioRef = useRef<HTMLAudioElement | null>(null)

  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [activeCameraIndex, setActiveCameraIndex] = useState(0)
  const [isStarting, setIsStarting] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState('')

  // Update the callback outside render.
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  // Initialize the scanner confirmation sound.
  useEffect(() => {
    const audio = new Audio(
      `${import.meta.env.BASE_URL}audio/scanner-beep.mp3`,
    )

    audio.preload = 'auto'
    audio.volume = 0.8

    scanAudioRef.current = audio

    return () => {
      audio.pause()
      audio.currentTime = 0
      scanAudioRef.current = null
    }
  }, [])

  async function playScanBeep() {
    const audio = scanAudioRef.current

    if (!audio) return

    try {
      audio.currentTime = 0
      await audio.play()
    } catch (err) {
      console.warn('Unable to play scanner beep:', err)
    }
  }

  async function startCamera(
    scanner: Html5Qrcode,
    cameraId: string,
  ) {
    await scanner.start(
      cameraId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      (decodedText) => {
        const now = Date.now()

        // Prevent repeated processing of the same QR in consecutive frames.
        if (now - lastScanAtRef.current < 1500) return

        lastScanAtRef.current = now

        // Play confirmation sound for every accepted scan.
        void playScanBeep()

        onScanRef.current(decodedText)
      },
      () => {
        // Ignore normal frame-by-frame QR detection failures.
      },
    )

    runningRef.current = true
  }

  useEffect(() => {
    let cancelled = false

    async function initializeScanner() {
      try {
        setIsStarting(true)
        setError('')

        const availableCameras = await Html5Qrcode.getCameras()

        if (cancelled) return

        if (!availableCameras.length) {
          throw new Error('No camera was found on this device.')
        }

        setCameras(availableCameras)

        // Prefer a rear camera when its label is available.
        const preferredIndex = availableCameras.findIndex((camera) =>
          /back|rear|environment/i.test(camera.label),
        )

        const initialIndex = preferredIndex >= 0 ? preferredIndex : 0

        setActiveCameraIndex(initialIndex)

        const scanner = new Html5Qrcode(readerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        })

        scannerRef.current = scanner

        await startCamera(
          scanner,
          availableCameras[initialIndex].id,
        )

        // Handle the component being closed while the camera starts.
        if (cancelled) {
          if (scanner.isScanning) {
            await scanner.stop()
          }

          runningRef.current = false
          await scanner.clear()
          scannerRef.current = null
        }
      } catch (err) {
        console.error('QR scanner initialization failed:', err)

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to start the camera.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsStarting(false)
        }
      }
    }

    initializeScanner()

    return () => {
      cancelled = true

      const scanner = scannerRef.current

      if (scanner) {
        void (async () => {
          try {
            if (scanner.isScanning) {
              await scanner.stop()
            }

            runningRef.current = false
            await scanner.clear()
          } catch (err) {
            console.error('QR scanner cleanup failed:', err)
          } finally {
            scannerRef.current = null
          }
        })()
      }
    }
  }, [readerId])

  async function switchCamera() {
    const scanner = scannerRef.current

    if (
      !scanner ||
      !runningRef.current ||
      cameras.length < 2 ||
      isSwitching
    ) {
      return
    }

    const nextIndex = (activeCameraIndex + 1) % cameras.length

    try {
      setIsSwitching(true)
      setError('')

      await scanner.stop()
      runningRef.current = false

      await startCamera(scanner, cameras[nextIndex].id)

      setActiveCameraIndex(nextIndex)
      lastScanAtRef.current = 0
    } catch (err) {
      console.error('Camera switch failed:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to switch camera.',
      )
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">
              Scan Inventory QR
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Point your camera at an item's QR code
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            aria-label="Close scanner"
          >
            <X size={19} />
          </button>
        </div>

        <div className="bg-slate-950 p-3">
          <div
            id={readerId}
            className="min-h-64 overflow-hidden rounded-xl"
          />

          {isStarting && (
            <div className="py-5 text-center text-sm text-white">
              <RefreshCw
                size={20}
                className="mx-auto mb-2 animate-spin"
              />
              Starting camera...
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-xl bg-red-950/70 p-3 text-sm text-red-200">
              <div className="flex items-center gap-2">
                <CameraOff size={17} />
                <span>{error}</span>
              </div>
              <p className="mt-2 text-xs text-red-200/80">
                Allow camera access in your browser and make sure the
                website is running on localhost or HTTPS.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <p className="text-center text-xs text-slate-500">
            Scanning stays active after each successful scan.
          </p>

          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              disabled={isStarting || isSwitching || Boolean(error)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Camera size={17} />
              {isSwitching ? 'Switching camera...' : 'Switch camera'}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Done scanning
          </button>
        </div>
      </div>
    </div>
  )
}
