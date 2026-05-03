"use client"

import { useState, useCallback, useId, useEffect, useRef } from "react"
import createGlobe from "cobe"
import { Syne, DM_Mono } from "next/font/google"
import { DottedMap, type Marker } from "@/components/ui/dotted-map"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { ArrowUp, MapPin, Loader2, Send } from "lucide-react"
import { getLocations, createLocation, changeUpvote } from "@/lib/actions"

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", display: "swap" })
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
})

const ACCENT = "#14bdeb"

// ── types ─────────────────────────────────────────────────────────────────────

interface Location {
  id: string
  name: string
  lat: number
  lng: number
  countryCode: string
  upvotes: number
  upvoted: boolean
}

type MapMarkerData = Marker & {
  overlay: { countryCode: string; label: string }
}

// ── seed data ─────────────────────────────────────────────────────────────────

const SEED: Location[] = [
  { id: "1", name: "Tokyo",    lat: 35.6762,  lng: 139.6503, countryCode: "jp", upvotes: 42, upvoted: false },
  { id: "2", name: "New York", lat: 40.7128,  lng: -74.006,  countryCode: "us", upvotes: 38, upvoted: false },
  { id: "3", name: "London",   lat: 51.5074,  lng: -0.1278,  countryCode: "gb", upvotes: 31, upvoted: false },
  { id: "4", name: "Paris",    lat: 48.8566,  lng: 2.3522,   countryCode: "fr", upvotes: 26, upvoted: false },
  { id: "5", name: "Sydney",   lat: -33.8688, lng: 151.2093, countryCode: "au", upvotes: 21, upvoted: false },
  { id: "6", name: "Cairo",    lat: 30.0444,  lng: 31.2357,  countryCode: "eg", upvotes: 17, upvoted: false },
  { id: "7", name: "Mumbai",   lat: 19.076,   lng: 72.8777,  countryCode: "in", upvotes: 12, upvoted: false },
]

// ── geocoding ─────────────────────────────────────────────────────────────────

async function geocode(city: string): Promise<{
  lat: number; lng: number; name: string; countryCode: string
} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`,
      { headers: { "Accept-Language": "en" } },
    )
    const data = await res.json()
    if (!data.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      name: data[0].display_name.split(",")[0].trim(),
      countryCode: (data[0].address?.country_code ?? "xx") as string,
    }
  } catch {
    return null
  }
}

// ── GlobeCanvas — direct COBE ──────────────────────────────────────────────────

interface GlobeCanvasProps {
  locations: Location[]
  topId: string | undefined
}

const LABEL_CSS = `
  .cobe-city-label {
    position: absolute;
    top: anchor(center);
    left: anchor(center);
    translate: -10px -50%;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.2s, filter 0.2s;
  }
  .cobe-city-label--top {
    translate: -13px -50%;
  }
  .cobe-flag {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid ${ACCENT};
    display: block;
  }
  .cobe-city-label--top .cobe-flag {
    width: 26px;
    height: 26px;
    border-width: 2.5px;
  }
  .cobe-city-pill {
    background: rgba(20,20,30,0.72);
    color: white;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    letter-spacing: 0.04em;
    white-space: nowrap;
    font-family: var(--font-dm-mono), monospace;
  }
  .cobe-city-label--top .cobe-city-pill {
    font-size: 11px;
    padding: 3px 10px;
  }
`

function GlobeCanvas({ locations, topId }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = canvas.offsetWidth

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width,
      height: width,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 8,
      baseColor: [1, 1, 1],
      // #14bdeb = rgb(20, 189, 235)
      markerColor: [20 / 255, 189 / 255, 235 / 255] as [number, number, number],
      glowColor: [0.94, 0.95, 0.97] as [number, number, number],
      opacity: 1,
      markers: locations.map((l) => ({
        id: `loc-${l.id}`,
        location: [l.lat, l.lng] as [number, number],
        size: 0.001,
      })),
    })

    globeRef.current = globe

    let phi = 0
    let rafId: number
    function animate() {
      phi += 0.003
      globe.update({ phi })
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      globe.destroy()
      globeRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.update({
      markers: locations.map((l) => ({
        id: `loc-${l.id}`,
        location: [l.lat, l.lng] as [number, number],
        size: 0.001,
      })),
    })
  }, [locations])

  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: LABEL_CSS }} />
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      {locations.map((loc) => {
        const isTop = loc.id === topId
        return (
          <div
            key={loc.id}
            className={`cobe-city-label${isTop ? " cobe-city-label--top" : ""}`}
            style={{
              positionAnchor: `--cobe-loc-${loc.id}`,
              opacity: `var(--cobe-visible-loc-${loc.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-loc-${loc.id}, 0)) * 8px))`,
            } as React.CSSProperties}
          >
            <img
              src={`https://flagcdn.com/w40/${loc.countryCode}.webp`}
              alt={loc.countryCode}
              className="cobe-flag"
            />
            <span className="cobe-city-pill">{loc.name}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function Page() {
  const clipId = useId().replace(/:/g, "-")
  const [view, setView] = useState<"globe" | "map">("globe")
  const [locations, setLocations] = useState<Location[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // load from DB on mount
  useEffect(() => {
    getLocations().then((rows) =>
      setLocations(rows.map((r) => ({ ...r, upvoted: false })))
    )
  }, [])

  const sorted = [...locations].sort((a, b) => b.upvotes - a.upvotes)
  const topId = sorted[0]?.id

  const upvote = (id: string) => {
    const loc = locations.find((l) => l.id === id)
    if (!loc) return
    const delta = loc.upvoted ? -1 : 1
    // optimistic update
    setLocations((locs) =>
      locs.map((l) =>
        l.id === id
          ? { ...l, upvotes: l.upvotes + delta, upvoted: !l.upvoted }
          : l,
      ),
    )
    changeUpvote(id, delta as 1 | -1)
  }

  const addLocation = useCallback(async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setError("")
    const result = await geocode(input.trim())
    if (!result) { setLoading(false); setError("City not found"); return }
    if (locations.find((l) => l.name.toLowerCase() === result.name.toLowerCase())) {
      setLoading(false); setError("Already on the map"); return
    }
    const newLoc: Location = {
      id: Date.now().toString(),
      ...result,
      upvotes: 1,
      upvoted: true,
    }
    await createLocation(newLoc)
    setLocations((locs) => [...locs, newLoc])
    setLoading(false)
    setInput("")
  }, [input, loading, locations])

  const mapMarkers: MapMarkerData[] = locations.map((l) => ({
    lat: l.lat,
    lng: l.lng,
    size: l.id === topId ? 2.0 : 1.3,
    pulse: l.id === topId,
    overlay: { countryCode: l.countryCode, label: l.name },
  }))

  return (
    <div
      className={`${syne.variable} ${dmMono.variable} flex h-screen overflow-hidden bg-white`}
      style={{ fontFamily: "var(--font-dm-mono), monospace" }}
    >
      {/* ── left: visualization ── */}
      <div className="relative flex-1 overflow-hidden bg-[#f6f7f9]">

        {/* top bar */}
        <div className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between px-8 py-6">
          <h1
            className="text-[20px] font-bold tracking-[0.22em] text-gray-900 uppercase"
            style={{ fontFamily: "var(--font-syne), sans-serif" }}
          >
            trip<span style={{ color: ACCENT }}>globe</span>
          </h1>
          <div className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
            {(["globe", "map"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="rounded-full px-5 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-all"
                style={view === v ? { background: ACCENT, color: "white" } : { color: "#9ca3af" }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ── globe view ── */}
        {view === "globe" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
            <span
              className="pointer-events-none z-10 mb-[-5rem] bg-gradient-to-b from-gray-900 to-gray-400/80 bg-clip-text text-center text-8xl leading-none font-bold text-transparent"
              style={{ fontFamily: "var(--font-syne), sans-serif" }}
            >
              senior trip
            </span>
            <div className="relative aspect-square w-full max-w-[680px]">
              <GlobeCanvas locations={locations} topId={topId} />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#f6f7f9] to-transparent" />
          </div>
        )}

        {/* ── map view ── */}
        {view === "map" && (
          <div className="absolute inset-0 flex items-center justify-center px-12 py-24">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#f6f7f9_95%)]" />
            <DottedMap<MapMarkerData>
              markers={mapMarkers}
              dotColor="#d4d8e2"
              markerColor={ACCENT}
              dotRadius={0.22}
              renderMarkerOverlay={({ marker, x, y, r, index }) => {
                const { countryCode, label } = marker.overlay
                const cid = `${clipId}-${index}`
                const imgR = r * 0.92
                const fontSize = r * 0.88
                const pillH = r * 1.5
                const pillW = label.length * (fontSize * 0.6) + r * 1.6
                const pillX = x + r + r * 0.55
                const pillY = y - pillH / 2

                return (
                  <g style={{ pointerEvents: "none" }}>
                    <clipPath id={cid}>
                      <circle cx={x} cy={y} r={imgR} />
                    </clipPath>
                    <image
                      href={`https://flagcdn.com/w80/${countryCode}.webp`}
                      x={x - imgR} y={y - imgR}
                      width={imgR * 2} height={imgR * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${cid})`}
                    />
                    <rect x={pillX} y={pillY} width={pillW} height={pillH} rx={pillH / 2} fill="rgba(20,20,30,0.72)" />
                    <text x={pillX + r * 0.7} y={y + fontSize * 0.35} fontSize={fontSize} fill="white">
                      {label}
                    </text>
                  </g>
                )
              }}
            />
          </div>
        )}
      </div>

      {/* ── right: sidebar feed ── */}
      <div className="flex w-[340px] shrink-0 flex-col border-l border-gray-100 bg-white">

        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-5">
          <MapPin size={13} style={{ color: ACCENT }} />
          <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">Locations</span>
          <span className="ml-auto text-[11px] tabular-nums" style={{ color: ACCENT }}>{locations.length}</span>
        </div>

        <ScrollArea className="flex-1">
          {sorted.map((loc, i) => (
            <div
              key={loc.id}
              className="flex items-center gap-3 border-b border-gray-50 px-6 py-3.5 transition-colors hover:bg-gray-50"
            >
              <span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-gray-300">
                {String(i + 1).padStart(2, "0")}
              </span>
              <img
                src={`https://flagcdn.com/w40/${loc.countryCode}.webp`}
                alt={loc.countryCode}
                className="h-[14px] w-[22px] shrink-0 rounded-[2px] object-cover shadow-sm"
              />
              <span className="flex-1 truncate text-[13px] text-gray-800">{loc.name}</span>
              <button
                onClick={() => upvote(loc.id)}
                className="flex items-center gap-1.5 transition-all"
                style={loc.upvoted ? { color: ACCENT } : { color: "#d1d5db" }}
                onMouseEnter={(e) => { if (!loc.upvoted) (e.currentTarget as HTMLElement).style.color = "#6b7280" }}
                onMouseLeave={(e) => { if (!loc.upvoted) (e.currentTarget as HTMLElement).style.color = "#d1d5db" }}
              >
                <ArrowUp size={12} strokeWidth={2.5} />
                <span className="text-[12px] tabular-nums">{loc.upvotes}</span>
              </button>
            </div>
          ))}
        </ScrollArea>

        <div className="border-t border-gray-100 px-6 py-6">
          {error && <p className="mb-3 text-[11px] text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => { setInput(e.target.value); setError("") }}
              onKeyDown={(e) => e.key === "Enter" && addLocation()}
              placeholder="Add a city..."
              className="h-11 flex-1 border-gray-200 text-[13px] text-gray-800 placeholder:text-gray-300"
              style={{ fontFamily: "var(--font-dm-mono), monospace" }}
              onFocus={(e) => { e.target.style.borderColor = ACCENT }}
              onBlur={(e) => { e.target.style.borderColor = "" }}
            />
            <button
              onClick={addLocation}
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white transition-all disabled:opacity-40"
              style={{ background: ACCENT }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
