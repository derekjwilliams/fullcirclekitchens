import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * SHOPIFY STORE (Query Param Version)
 * Links to /product?handle=...
 */

export default function ShopifyStore(props) {
    const [products, setProducts] = React.useState([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState(null)

    const gridClass = "shopify-grid-layout"

    const formatPrice = (amount, currencyCode) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(amount)
    }

    React.useEffect(() => {
        const fetchProducts = async () => {
            if (!props.storeDomain || !props.accessToken) return

            const query = `
            {
              products(first: ${props.limit}) {
                edges {
                  node {
                    id
                    title
                    handle
                    images(first: 1) { edges { node { src } } }
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
                    `https://${props.storeDomain}/api/2023-01/graphql.json`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Shopify-Storefront-Access-Token": props.accessToken,
                        },
                        body: JSON.stringify({ query }),
                    }
                )

                const result = await response.json()
                if (result.errors) throw new Error(result.errors[0].message)
                if (!result.data) throw new Error("No data returned")
                setProducts(result.data.products.edges)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [props.storeDomain, props.accessToken, props.limit])

    // -- CSS STYLES --
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
            cursor: pointer; 
        }
        .shopify-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1) !important;
        }
    `

    if (!props.storeDomain || !props.accessToken) {
        return <div style={placeholderStyle}>Add Domain & Token in controls 👉</div>
    }

    if (loading) return <div style={placeholderStyle}>Loading products...</div>
    if (error) return <div style={{...placeholderStyle, color: "red"}}>Error: {error}</div>

    return (
        <>
            <style>{css}</style>
            <div className={gridClass}>
                {products.map(({ node }) => {
                    const variantNode = node.variants.edges[0]?.node
                    const variantId = variantNode?.id.split("/").pop()
                    const imageSrc = node.images.edges[0]?.node.src
                    const isAvailable = variantNode?.availableForSale

                    const rawPrice = variantNode?.price.amount
                    const rawCompare = variantNode?.compareAtPrice?.amount
                    const currency = variantNode?.price.currencyCode
                    const price = formatPrice(rawPrice, currency)
                    const comparePrice = rawCompare ? formatPrice(rawCompare, currency) : null
                    const isOnSale = rawCompare && parseFloat(rawCompare) > parseFloat(rawPrice)

                    // URL CHANGE: Using Query Param
                    const productUrl = `/product?handle=${node.handle}`

                    return (
                        <div key={node.id} className="shopify-card" style={cardStyle}>
                            
                            {/* LINK OVERLAY */}
                            <a 
                                href={productUrl}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: "100%",
                                    zIndex: 1, 
                                }}
                            />

                            <div style={{
                                ...imageContainerStyle, 
                                backgroundImage: `url(${imageSrc})`,
                                opacity: isAvailable ? 1 : 0.6 
                            }} />
                            
                            <h3 style={titleStyle}>{node.title}</h3>
                            
                            <div style={priceContainerStyle}>
                                <span style={{
                                    ...priceStyle, 
                                    color: isOnSale ? "#D32F2F" : "#333", 
                                    fontWeight: isOnSale ? 600 : 400
                                }}>
                                    {price}
                                </span>
                                {isOnSale && (
                                    <span style={comparePriceStyle}>
                                        {comparePrice}
                                    </span>
                                )}
                            </div>

                            {/* BUY BUTTON */}
                            <div style={{marginTop: "auto", position: "relative", zIndex: 2}}>
                                {isAvailable ? (
                                    <a 
                                        href={`https://${props.storeDomain}/cart/${variantId}:1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            ...buttonStyle,
                                            backgroundColor: props.buttonColor
                                        }}
                                    >
                                        {props.buttonLabel}
                                    </a>
                                ) : (
                                    <div style={disabledButtonStyle}>Sold</div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}

// ... (KEEP YOUR EXISTING STYLES AT THE BOTTOM) ...
// (I omitted the bottom styles block for brevity, paste them back in here)
const cardStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    overflow: "hidden",
}

const imageContainerStyle = {
    width: "100%",
    aspectRatio: "1 / 1",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    transition: "opacity 0.3s",
    marginBottom: "12px" 
}

const titleStyle = {
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
    fontFamily: "Inter, sans-serif",
    color: "#333",
}

const priceContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
}

const priceStyle = {
    fontSize: "14px",
    fontFamily: "Inter, sans-serif",
    margin: 0,
}

const comparePriceStyle = {
    fontSize: "13px",
    fontFamily: "Inter, sans-serif",
    margin: 0,
    color: "#999",
    textDecoration: "line-through",
}

const buttonStyle = {
    display: "block",
    textAlign: "center",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
    transition: "opacity 0.2s",
    cursor: "pointer"
}

const disabledButtonStyle = {
    display: "block",
    textAlign: "center",
    color: "#999",
    backgroundColor: "#eee",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
    cursor: "not-allowed",
    pointerEvents: "none"
}

const placeholderStyle = {
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
    padding: "20px"
}

addPropertyControls(ShopifyStore, {
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
        defaultValue: 250,
        min: 150,
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
    buttonLabel: {
        type: ControlType.String,
        title: "Button Text",
        defaultValue: "Buy Now",
    },
    buttonColor: {
        type: ControlType.Color,
        title: "Button Color",
        defaultValue: "#000000",
    },
})