"""Content Generation & Validation API routes."""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.database import get_supabase
from app.services.content_generator import generate_optimized_content, validate_content, generate_action_content

router = APIRouter()


@router.get("/products/{brand_id}")
def get_brand_products(brand_id: int):
    """Get all products for a brand (ground truth data)."""
    sb = get_supabase()
    result = sb.table("products").select("*").eq("brand_id", brand_id).execute()
    return result.data or []


@router.post("/generate/{product_id}")
async def generate_content(product_id: int):
    """Generate optimized AI-ready content for a product."""
    sb = get_supabase()

    product = sb.table("products").select("*, brands(name)").eq("id", product_id).execute()
    if not product.data:
        return {"error": "Product not found"}

    prod = product.data[0]
    brand_name = prod.get("brands", {}).get("name", "Unknown")

    content = await generate_optimized_content(prod, brand_name)
    validation = validate_content(content, prod)

    return {
        "product": prod["name"],
        "brand": brand_name,
        "generated_content": content,
        "validation": validation,
    }


@router.post("/action/{product_id}/{content_type}")
async def generate_action(product_id: int, content_type: str):
    """Generate ready-to-publish content. Types: schema, press_release, reddit, pitch_email, faq"""
    sb = get_supabase()
    product = sb.table("products").select("*, brands(name)").eq("id", product_id).execute()
    if not product.data:
        return {"error": "Product not found"}

    prod = product.data[0]
    brand_name = prod.get("brands", {}).get("name", "Unknown")
    result = generate_action_content(prod, brand_name, content_type)
    return result


@router.get("/action/types")
def get_content_types():
    """Get available content action types."""
    return [
        {"id": "schema", "name": "Schema.org JSON-LD", "desc": "Structured data markup for AI crawlers", "icon": "code"},
        {"id": "press_release", "name": "Press Release", "desc": "Distribute to PR channels AI indexes", "icon": "newspaper"},
        {"id": "reddit", "name": "Reddit Post", "desc": "Community content AI assistants cite", "icon": "chat"},
        {"id": "pitch_email", "name": "Blogger Pitch", "desc": "Outreach to create review content", "icon": "mail"},
        {"id": "faq", "name": "FAQ Content", "desc": "FAQ schema for direct AI answers", "icon": "help"},
    ]


@router.post("/validate/{product_id}")
async def validate_product_content(product_id: int):
    """Run 3-step verification on a product's current content."""
    sb = get_supabase()

    product = sb.table("products").select("*, brands(name)").eq("id", product_id).execute()
    if not product.data:
        return {"error": "Product not found"}

    prod = product.data[0]
    brand_name = prod.get("brands", {}).get("name", "Unknown")

    # Generate content to validate
    content = await generate_optimized_content(prod, brand_name)
    validation = validate_content(content, prod)

    return {
        "product": prod["name"],
        "verification_steps": validation["steps_completed"],
        "valid": validation["valid"],
        "issues": validation["issues"],
    }
