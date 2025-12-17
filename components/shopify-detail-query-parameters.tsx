import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * SHOPIFY PRODUCT DETAIL (Query Params Version)
 * Reads ?handle=xyz from URL
 */

export default function ShopifyDetail(props) {
    const [product, setProduct] = React.useState(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState(null)

    const formatPrice = (amount, currencyCode) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(amount)
    }

    React.useEffect(() => {
        // --- QUERY PARAM LOGIC ---
        // 1. Get query string from URL
        const params = new URLSearchParams(window.location.search)
        const handle = params.get("handle")

        // Debug
        console.log("Fetching Query Param Handle:", handle)

        if (!handle) {
            setError("No product selected")
            setLoading(false)
            return
        }

        if (!props.storeDomain || !props.accessToken) return

        const fetchProduct = async () => {
            const query = `
            {
              productByHandle(handle: "${handle}") {
                id
                title
                description
                images(first: 5) { edges { node { src } } }
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
                
                if (!result.data || !result.data.productByHandle) {
                   throw new Error("Product not found")
                }

                setProduct(result.data.productByHandle)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchProduct()
    }, [props.storeDomain, props.accessToken])

    // --- RENDER STATES ---

    if (loading) return (
        <div style={statusStyle}>
            <div className="loading-spinner">Loading...</div>
        </div>
    )

    if (error) return (
        <div style={statusStyle}>
            <h3>Product not found</h3>
            <p style={{color: "#666"}}>{error}</p>
            <a href="/" style={backLinkStyle}>← Back to Shop</a>
        </div>
    )

    if (!product) return null

    const variantNode = product.variants.edges[0]?.node
    const variantId = variantNode?.id.split("/").pop()
    const mainImage = product.images.edges[0]?.node.src
    const price = formatPrice(variantNode?.price.amount, variantNode?.price.currencyCode)
    const isAvailable = variantNode?.availableForSale

    return (
        <div style={wrapperStyle}>
            <div style={containerStyle}>
                <div style={colStyle}>
                    <div style={{
                        ...imageStyle, 
                        backgroundImage: `url(${mainImage})`
                    }} />
                </div>

                <div style={colStyle}>
                    <h1 style={titleStyle}>{product.title}</h1>
                    <h2 style={priceStyle}>{price}</h2>
                    
                    <div style={descStyle}>
                        {product.description}
                    </div>

                    {isAvailable ? (
                        <a 
                            href={`https://${props.storeDomain}/cart/${variantId}:1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{...buttonStyle, backgroundColor: props.buttonColor}}
                        >
                            {props.buttonLabel}
                        </a>
                    ) : (
                        <div style={disabledButtonStyle}>Sold Out</div>
                    )}
                </div>
            </div>
            
            <style>{`
                @media (max-width: 800px) {
                    .shopify-detail-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    )
}

// ... (KEEP YOUR EXISTING STYLES) ...
// (I omitted the bottom styles block again, assume they are the same as before)
const wrapperStyle = {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "60px 20px",
    backgroundColor: "#fff", 
}

const containerStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "60px",
    width: "100%",
    maxWidth: "1100px",
    className: "shopify-detail-grid"
}

const statusStyle = {
    width: "100%",
    height: "60vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, sans-serif",
}

const colStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    justifyContent: "flex-start"
}

const imageStyle = {
    width: "100%",
    aspectRatio: "1 / 1",
    backgroundSize: "contain",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
    borderRadius: "12px",
}

const titleStyle = {
    fontSize: "36px",
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.2,
    fontFamily: "Inter, sans-serif",
    color: "#111"
}

const priceStyle = {
    fontSize: "24px",
    fontWeight: 500,
    color: "#555",
    margin: 0,
    fontFamily: "Inter, sans-serif",
}

const descStyle = {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#444",
    fontFamily: "Inter, sans-serif",
    whiteSpace: "pre-wrap"
}

const buttonStyle = {
    display: "inline-block",
    textAlign: "center",
    color: "white",
    padding: "16px 32px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    maxWidth: "250px",
    cursor: "pointer",
    marginTop: "20px",
    fontFamily: "Inter, sans-serif",
}

const disabledButtonStyle = {
    display: "inline-block",
    textAlign: "center",
    color: "#999",
    backgroundColor: "#eee",
    padding: "16px 32px",
    borderRadius: "8px",
    fontWeight: "600",
    maxWidth: "250px",
    cursor: "not-allowed",
    marginTop: "20px",
    fontFamily: "Inter, sans-serif",
}

const backLinkStyle = {
    marginTop: "20px",
    textDecoration: "none",
    color: "black",
    fontWeight: 600
}

addPropertyControls(ShopifyDetail, {
    storeDomain: {
        type: ControlType.String,
        title: "Store Domain",
        placeholder: "shop.myshopify.com",
    },
    accessToken: {
        type: ControlType.String,
        title: "API Token",
        placeholder: "Paste Storefront Token...",
    },
    buttonLabel: {
        type: ControlType.String,
        title: "Button Text",
        defaultValue: "Add to Cart",
    },
    buttonColor: {
        type: ControlType.Color,
        title: "Button Color",
        defaultValue: "#000000",
    },
})