import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { HttpsProxyAgent } from "https-proxy-agent"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const imageUrl = searchParams.get("url")

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    // Create proxy agent if proxy is configured
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY

    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      // Use https-proxy-agent if proxy is configured
      ...(proxyUrl && {
        httpsAgent: new HttpsProxyAgent(proxyUrl),
        proxy: false,
      }),
    })

    const base64 = Buffer.from(response.data).toString("base64")
    const contentType = response.headers["content-type"] || "image/jpeg"

    return NextResponse.json({
      dataUrl: `data:${contentType};base64,${base64}`,
    }, {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error: any) {
    console.error("Image fetch error:", error?.message || error)
    console.error("Error details:", {
      code: error?.code,
      status: error?.response?.status,
      data: error?.response?.data,
    })

    const errorMessage = error?.code === "ECONNABORTED"
      ? "Request timeout"
      : error?.response?.status
        ? `HTTP ${error.response.status}`
        : error?.message || "Failed to fetch image"

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
