//@ts-ignore
import * as React from "react"
//@ts-ignore
import { addPropertyControls, ControlType } from "framer"

/**
 * HELPER: Parse Route
 * Converts a URL path (e.g. /shop/vase) into Framer's internal ID
 */
function parseRoute(routes: any, targetPath: string) {
    for (const [routeId, routeInfo] of Object.entries(routes)) {
        const pattern = (routeInfo as any).path
        if (!pattern) continue

        const paramNames: string[] = []
        // Convert route pattern /shop/:slug to regex
        const regexPattern = pattern.replace(/:(\w+)/g, (_, paramName) => {
            paramNames.push(paramName)
            return "([^/]+)"
        })

        const regex = new RegExp(`^${regexPattern}$`)
        const match = targetPath.match(regex)

        if (match) {
            const params = paramNames.reduce(
                (acc, name, index) => ({
                    ...acc,
                    [name]: match[index + 1],
                }),
                {}
            )
            return { routeId, params }
        }
    }
    return null
}

/**
 * Extract Facebook Marketplace URL from Shopify descriptionHtml.
 * Looks for a <p> that contains text "Original Facebook Marketplace Listing:"
 * and then returns the href of the first <a> inside that <p>.
 */
function extractFacebookMarketplaceUrl(
    descriptionHtml?: string | null
): string | null {
    if (!descriptionHtml) return null

    // Preferred: DOM parsing
    try {
        if (typeof window !== "undefined" && "DOMParser" in window) {
            const parser = new DOMParser()
            const doc = parser.parseFromString(descriptionHtml, "text/html")
            const paragraphs = Array.from(doc.querySelectorAll("p"))

            const target = paragraphs.find((p) =>
                (p.textContent || "").includes(
                    "Original Facebook Marketplace Listing:"
                )
            )

            if (!target) return null
            const a = target.querySelector("a[href]")
            const href = a?.getAttribute("href")
            return href || null
        }
    } catch {
        // fall through to regex
    }

    // Fallback: regex extraction (less robust but works for simple HTML)
    const re = /Original Facebook Marketplace Listing:\s*<a[^>]*href="([^"]+)"/i
    const m = descriptionHtml.match(re)
    return m?.[1] ?? null
}

/**
 * Remove the "Original Facebook Marketplace Listing:" paragraph (and its link)
 * from Shopify descriptionHtml, returning the remaining HTML.
 */
function cleanDescriptionHtml(descriptionHtml?: string | null): string {
    if (!descriptionHtml) return ""

    // Preferred: DOM parsing
    try {
        if (typeof window !== "undefined" && "DOMParser" in window) {
            const parser = new DOMParser()
            const doc = parser.parseFromString(descriptionHtml, "text/html")

            const paragraphs = Array.from(doc.querySelectorAll("p"))
            for (const p of paragraphs) {
                const text = (p.textContent || "").trim()
                if (
                    text.includes("Original Facebook Marketplace Listing:") ||
                    text.startsWith("Original Facebook Marketplace Listing:")
                ) {
                    p.remove()
                }
            }
            return doc.body.innerHTML || ""
        }
    } catch {
        // fall through to regex
    }

    // Fallback: remove the whole paragraph that contains the marker text
    return descriptionHtml.replace(
        /<p[^>]*>\s*Original Facebook Marketplace Listing:[\s\S]*?<\/p>/gi,
        ""
    )
}

/**
 * IMAGE CAROUSEL (horizontal scroll, one image per "page")
 */
function ProductImageCarousel({
    images,
    title,
    dimmed,
    showArrows,
    showDots,
}: {
    images: string[]
    title?: string
    dimmed?: boolean
    showArrows?: boolean
    showDots?: boolean
}) {
    const trackRef = React.useRef<HTMLDivElement | null>(null)
    const [index, setIndex] = React.useState(0)

    const safeImages = Array.isArray(images) ? images.filter(Boolean) : []

    const scrollToIndex = React.useCallback(
        (nextIndex: number) => {
            const el = trackRef.current
            if (!el) return
            const clamped = Math.max(
                0,
                Math.min(nextIndex, safeImages.length - 1)
            )
            el.scrollTo({
                left: el.clientWidth * clamped,
                behavior: "smooth",
            })
        },
        [safeImages.length]
    )

    const onScroll = React.useCallback(() => {
        const el = trackRef.current
        if (!el) return
        const w = el.clientWidth || 1
        const next = Math.round(el.scrollLeft / w)
        setIndex(Math.max(0, Math.min(next, safeImages.length - 1)))
    }, [safeImages.length])

    React.useEffect(() => {
        setIndex(0)
        const el = trackRef.current
        if (el) el.scrollTo({ left: 0 })
    }, [safeImages.length])

    if (safeImages.length === 0) {
        return (
            <div
                style={{
                    ...imageContainerStyle,
                    opacity: dimmed ? 0.6 : 1,
                }}
            />
        )
    }

    const canGoPrev = index > 0
    const canGoNext = index < safeImages.length - 1

    return (
        <div
            className="shopify-carousel"
            style={{
                ...carouselContainerStyle,
                opacity: dimmed ? 0.6 : 1,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                ref={trackRef}
                className="shopify-carousel-track"
                style={carouselTrackStyle}
                onScroll={onScroll}
            >
                {safeImages.map((src, i) => (
                    <div
                        key={`${src}-${i}`}
                        className="shopify-carousel-slide"
                        style={carouselSlideStyle}
                    >
                        <img
                            src={src}
                            alt={title ? `${title} image ${i + 1}` : ""}
                            style={carouselImgStyle}
                            draggable={false}
                        />
                    </div>
                ))}
            </div>

            {showArrows && safeImages.length > 1 && (
                <>
                    <button
                        type="button"
                        style={{
                            ...carouselArrowStyle,
                            left: 8,
                            opacity: canGoPrev ? 1 : 0.35,
                            pointerEvents: canGoPrev ? "auto" : "none",
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            scrollToIndex(index - 1)
                        }}
                        aria-label="Previous image"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        style={{
                            ...carouselArrowStyle,
                            right: 8,
                            opacity: canGoNext ? 1 : 0.35,
                            pointerEvents: canGoNext ? "auto" : "none",
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            scrollToIndex(index + 1)
                        }}
                        aria-label="Next image"
                    >
                        ›
                    </button>
                </>
            )}

            {showDots && safeImages.length > 1 && (
                <div style={carouselDotsWrapStyle}>
                    {safeImages.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Go to image ${i + 1}`}
                            style={{
                                ...carouselDotStyle,
                                opacity: i === index ? 1 : 0.35,
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                scrollToIndex(i)
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function IconLinkButton({
    href,
    ariaLabel,
    children,
    borderColor,
    onClick,
}: {
    href: string
    ariaLabel: string
    children: React.ReactNode
    borderColor: string
    onClick?: (e: any) => void
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ariaLabel}
            style={{
                ...iconButtonStyle,
                borderColor,
                color: borderColor,
            }}
            onClick={onClick}
        >
            <span style={iconWrapStyle}>{children}</span>
        </a>
    )
}

export default function ShopifyStore(props: any) {
    const [products, setProducts] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [showSold, setShowSold] = React.useState(false)

    const gridClass = "shopify-grid-layout"

    const formatPrice = (amount: string | number, currencyCode: string) => {
        const n = typeof amount === "string" ? parseFloat(amount) : amount
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currencyCode,
        }).format(n)
    }

    const visibleProducts = React.useMemo(() => {
        const decorated = products.map((p, idx) => {
            const variantNode = p?.node?.variants?.edges?.[0]?.node
            const isAvailable = Boolean(variantNode?.availableForSale)

            return { p, idx, isAvailable }
        })

        // If sold items are hidden, filter them out
        const filtered = showSold
            ? decorated
            : decorated.filter((x) => x.isAvailable)

        // Sort: available first, sold last (stable via idx)
        filtered.sort((a, b) => {
            if (a.isAvailable === b.isAvailable) return a.idx - b.idx
            return a.isAvailable ? -1 : 1
        })

        return filtered.map((x) => x.p)
    }, [products, showSold])

    /*
    const visibleProducts = React.useMemo(() => {
        if (showSold) return products

        return products.filter(({ node }) => {
            const variantNode = node?.variants?.edges?.[0]?.node
            return Boolean(variantNode?.availableForSale)
        })
    }, [products, showSold])*/

    React.useEffect(() => {
        const fetchProducts = async () => {
            if (!props.storeDomain || !props.accessToken) return

            /**
             * Shopify Storefront API caps images pagination (up to 250 per request).
             * This fetches up to `imageLimit` images per product.
             */
            const imageLimit = Math.min(
                Math.max(props.imageLimit ?? 20, 1),
                250
            )

            const query = `
            {
              products(first: ${props.limit}) {
                edges {
                  node {
                    id
                    title
                    handle
                    descriptionHtml
                    images(first: ${imageLimit}) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                    variants(first: 1) {
                      edges {
                        node {
                          id
                          availableForSale
                          price { amount currencyCode }
                          compareAtPrice { amount currencyCode }
                        }
                      }
                    }
                  }
                }
              }
            }
            `

            try {
                const response = await fetch(
                    `https://${props.storeDomain}/api/2024-10/graphql.json`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Shopify-Storefront-Access-Token":
                                props.accessToken,
                        },
                        body: JSON.stringify({ query }),
                    }
                )

                const result = await response.json()
                if (result.errors) throw new Error(result.errors[0].message)
                if (!result.data) throw new Error("No data returned")
                setProducts(result.data.products.edges)
            } catch (err: any) {
                setError(err?.message ?? "Unknown error")
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [props.storeDomain, props.accessToken, props.limit, props.imageLimit])

    const css = `
        .${gridClass} {
            display: grid;
            gap: 24px;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            padding: 40px 4px;
            grid-template-columns: repeat(auto-fill, minmax(${props.minCardWidth}px, 1fr));
        }

        @media (max-width: 800px) {
            .${gridClass} { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 450px) {
            .${gridClass} { grid-template-columns: 1fr; }
        }

        .shopify-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
        }

        .shopify-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1) !important;
        }

        .shopify-description p {
            margin: 0 0 8px 0;
        }
        .shopify-description p:last-child {
            margin-bottom: 0;
        }

        /* Carousel scroll behavior */
        .shopify-carousel-track {
            scrollbar-width: none;
        }
        .shopify-carousel-track::-webkit-scrollbar {
            display: none;
        }
    `

    if (!props.storeDomain || !props.accessToken) {
        return (
            <div style={placeholderStyle}>
                Add Domain & Token in controls 👉
            </div>
        )
    }

    if (loading) return <div style={placeholderStyle}>Loading products...</div>

    if (error) {
        return (
            <div style={{ ...placeholderStyle, color: "red" }}>
                Error: {error}
            </div>
        )
    }

    return (
        <>
            <style>{css}</style>
            <div style={toolbarStyle}>
                <button
                    type="button"
                    style={toggleSoldButtonStyle}
                    onClick={() => setShowSold((v) => !v)}
                >
                    {showSold ? "Hide sold items" : "Show sold items"}
                </button>
            </div>
            <div className={gridClass}>
                {visibleProducts.map(({ node }) => {
                    const variantNode = node.variants.edges[0]?.node
                    const variantId = variantNode?.id.split("/").pop()
                    const isAvailable = variantNode?.availableForSale

                    const rawPrice = variantNode?.price.amount
                    const rawCompare = variantNode?.compareAtPrice?.amount
                    const currency = variantNode?.price.currencyCode
                    const price = formatPrice(rawPrice, currency)
                    const comparePrice = rawCompare
                        ? formatPrice(rawCompare, currency)
                        : null
                    const isOnSale =
                        rawCompare &&
                        parseFloat(rawCompare) > parseFloat(rawPrice)

                    // Internal Framer product page route (your site)
                    const productUrl = `/shop/${node.handle}`

                    // Shopify product page
                    const shopifyProductUrl = `https://${props.storeDomain}/products/${node.handle}`

                    // FB Marketplace URL from descriptionHtml
                    const fbUrl = extractFacebookMarketplaceUrl(
                        node.descriptionHtml
                    )

                    const cleanedDescription = cleanDescriptionHtml(
                        node.descriptionHtml
                    )

                    const imageUrls =
                        node.images?.edges?.map((e: any) => e?.node?.url) ?? []

                    return (
                        <div
                            key={node.id}
                            className="shopify-card"
                            style={cardStyle}
                        >
                            <ProductImageCarousel
                                images={imageUrls}
                                title={node.title}
                                dimmed={!isAvailable}
                                showArrows={props.showCarouselArrows}
                                showDots={props.showCarouselDots}
                            />
                            {/* DESCRIPTION (FB listing paragraph removed) */}
                            {props.showDescription && cleanedDescription && (
                                <div
                                    className="shopify-description"
                                    style={titleStyle}
                                    onClick={(e) => e.stopPropagation()}
                                    dangerouslySetInnerHTML={{
                                        __html: cleanedDescription,
                                    }}
                                />
                            )}
                            {!props.showDescription ||
                                (!cleanedDescription && (
                                    <h3 style={titleStyle}>{node.title}</h3>
                                ))}
                            <div style={priceContainerStyle}>
                                <span
                                    style={{
                                        ...priceStyle,
                                        color: isOnSale ? "#D32F2F" : "#333",
                                        fontWeight: isOnSale ? 600 : 400,
                                    }}
                                >
                                    {price}
                                </span>
                                {isOnSale && (
                                    <span style={comparePriceStyle}>
                                        {comparePrice}
                                    </span>
                                )}
                            </div>
                            <div
                                style={{
                                    marginTop: "auto",
                                    position: "relative",
                                    zIndex: 2,
                                }}
                            >
                                <div style={buttonRowStyle}>
                                    {/* BUY BUTTON (flexes to fill remaining width) */}
                                    {isAvailable ? (
                                        <a
                                            href={`https://${props.storeDomain}/cart/${variantId}:1`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                ...buyRowButtonStyle,
                                                backgroundColor:
                                                    props.buttonColor,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {props.buttonLabel}
                                        </a>
                                    ) : (
                                        <div style={buyRowDisabledStyle}>
                                            Sold
                                        </div>
                                    )}

                                    {/* VIEW ON SHOPIFY (icon) */}
                                    {props.showViewOnShopify &&
                                        props.shopifyIconFile && (
                                            <a
                                                href={shopifyProductUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={
                                                    props.viewButtonLabel ||
                                                    "View on Shopify"
                                                }
                                                style={{
                                                    ...iconButtonStyle,
                                                    borderColor:
                                                        props.viewButtonColor ||
                                                        "#111",
                                                }}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <img
                                                    src={props.shopifyIconFile}
                                                    alt=""
                                                    style={{
                                                        width: props.iconSize,
                                                        height: props.iconSize,
                                                        display: "block",
                                                    }}
                                                />
                                            </a>
                                        )}

                                    {/* VIEW ON FB MARKETPLACE (icon) */}
                                    {props.showViewOnFbMarketplace &&
                                        fbUrl &&
                                        props.fbIconFile && (
                                            <a
                                                href={fbUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={
                                                    props.fbButtonLabel ||
                                                    "View on FB Marketplace"
                                                }
                                                style={{
                                                    ...iconButtonStyle,
                                                    borderColor:
                                                        props.fbButtonColor ||
                                                        "#1877F2",
                                                }}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <img
                                                    src={props.fbIconFile}
                                                    alt=""
                                                    style={{
                                                        width: props.iconSize,
                                                        height: props.iconSize,
                                                        display: "block",
                                                    }}
                                                />
                                            </a>
                                        )}
                                </div>
                            </div>{" "}
                        </div>
                    )
                })}
            </div>
        </>
    )
}

// -- STYLES --

const buttonRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
}

const toolbarStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    padding: "0 4px",
    marginBottom: 12,
}

const toggleSoldButtonStyle: React.CSSProperties = {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    color: "#333",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
}

const buyRowButtonStyle: React.CSSProperties = {
    flex: 1,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    padding: "0 12px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
    transition: "opacity 0.2s",
    cursor: "pointer",
    whiteSpace: "nowrap",
}

const buyRowDisabledStyle: React.CSSProperties = {
    flex: 1,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    backgroundColor: "#eee",
    borderRadius: "10px",
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
    cursor: "not-allowed",
    pointerEvents: "none",
}

const iconButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    width: 44,
    backgroundColor: "transparent",
    textDecoration: "none",
    cursor: "pointer",
}

const iconWrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
}

const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    overflow: "hidden",
}

const imageContainerStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: "1 / 1",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    transition: "opacity 0.3s",
    marginBottom: "12px",
}

/** Carousel styles */
const carouselContainerStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: "8px",
    backgroundColor: "#f0f0f0",
    overflow: "hidden",
    position: "relative",
    marginBottom: "12px",
}

const carouselTrackStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    overflowX: "auto",
    overflowY: "hidden",
    scrollSnapType: "x mandatory",
    WebkitOverflowScrolling: "touch",
}

const carouselSlideStyle: React.CSSProperties = {
    flex: "0 0 100%",
    width: "100%",
    height: "100%",
    scrollSnapAlign: "start",
}

const carouselImgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    userSelect: "none",
    pointerEvents: "none",
}

const carouselArrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "none",
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
    cursor: "pointer",
    zIndex: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    lineHeight: "20px",
}

const carouselDotsWrapStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    display: "flex",
    justifyContent: "center",
    gap: 6,
    zIndex: 3,
}

const carouselDotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: 999,
    border: "none",
    background: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    padding: 0,
}

const titleStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
    fontFamily: "Inter, sans-serif",
    color: "#333",
}

const priceContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
}

const priceStyle: React.CSSProperties = {
    fontSize: "14px",
    fontFamily: "Inter, sans-serif",
    margin: 0,
}

const comparePriceStyle: React.CSSProperties = {
    fontSize: "13px",
    fontFamily: "Inter, sans-serif",
    margin: 0,
    color: "#999",
    textDecoration: "line-through",
}

const buttonStyle: React.CSSProperties = {
    display: "block",
    textAlign: "center",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
    transition: "opacity 0.2s",
    cursor: "pointer",
}

const secondaryButtonStyle: React.CSSProperties = {
    display: "block",
    textAlign: "center",
    backgroundColor: "transparent",
    padding: "12px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
    transition: "opacity 0.2s",
    cursor: "pointer",
    border: "1px solid #111",
    marginTop: "10px",
}

const disabledButtonStyle: React.CSSProperties = {
    display: "block",
    textAlign: "center",
    color: "#999",
    backgroundColor: "#eee",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
    cursor: "not-allowed",
    pointerEvents: "none",
}

const placeholderStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 153, 255, 0.1)",
    color: "#0099ff",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 500,
    padding: "20px",
}

const descriptionStyle: React.CSSProperties = {
    fontSize: "13px",
    lineHeight: "1.45",
    fontFamily: "Inter, sans-serif",
    color: "#555",
}

addPropertyControls(ShopifyStore, {
    shopifyIconFile: {
        type: ControlType.File,
        title: "Shopify Icon",
        allowedFileTypes: ["svg", "png", "jpg", "jpeg", "webp"],
    },
    fbIconFile: {
        type: ControlType.File,
        title: "FB Icon",
        allowedFileTypes: ["svg", "png", "jpg", "jpeg", "webp"],
    },
    iconSize: {
        type: ControlType.Number,
        title: "Icon Size",
        defaultValue: 18,
        min: 10,
        max: 40,
        displayStepper: true,
    },
    storeDomain: {
        type: ControlType.String,
        title: "Store Domain",
        placeholder: "your-shop.myshopify.com",
    },
    accessToken: {
        type: ControlType.String,
        title: "API Token",
        placeholder: "Paste Storefront Token...",
    },
    minCardWidth: {
        type: ControlType.Number,
        title: "Min Desktop Width",
        defaultValue: 450,
        min: 400,
        max: 500,
        displayStepper: true,
    },
    limit: {
        type: ControlType.Number,
        title: "Product Limit",
        defaultValue: 6,
        min: 1,
        max: 50,
        displayStepper: true,
    },

    // Images + carousel controls
    imageLimit: {
        type: ControlType.Number,
        title: "Images / Product",
        defaultValue: 20,
        min: 1,
        max: 250,
        displayStepper: true,
    },
    showCarouselArrows: {
        type: ControlType.Boolean,
        title: "Carousel Arrows",
        defaultValue: true,
    },
    showCarouselDots: {
        type: ControlType.Boolean,
        title: "Carousel Dots",
        defaultValue: true,
    },

    // Primary button
    buttonLabel: {
        type: ControlType.String,
        title: "Buy Button Text",
        defaultValue: "Buy Now",
    },
    buttonColor: {
        type: ControlType.Color,
        title: "Buy Button Color",
        defaultValue: "#000000",
    },

    // View on Shopify
    showViewOnShopify: {
        type: ControlType.Boolean,
        title: "Show Shopify Button",
        defaultValue: true,
    },
    viewButtonLabel: {
        type: ControlType.String,
        title: "Shopify Button Text",
        defaultValue: "View on Shopify",
    },
    viewButtonColor: {
        type: ControlType.Color,
        title: "Shopify Button Color",
        defaultValue: "#111111",
    },

    // View on FB Marketplace (from descriptionHtml)
    showViewOnFbMarketplace: {
        type: ControlType.Boolean,
        title: "Show FB Button",
        defaultValue: true,
    },
    fbButtonLabel: {
        type: ControlType.String,
        title: "FB Button Text",
        defaultValue: "View on FB Marketplace",
    },
    fbButtonColor: {
        type: ControlType.Color,
        title: "FB Button Color",
        defaultValue: "#1877F2",
    },
    showDescription: {
        type: ControlType.Boolean,
        title: "Show Description",
        defaultValue: true,
    },
})
