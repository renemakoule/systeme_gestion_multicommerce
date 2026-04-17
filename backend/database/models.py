from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel

class Company(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    type: str = Field(default="boutique") # boutique, restaurant, pharmacie...
    address: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    currency: str = Field(default="FCFA")
    tax_rate: float = Field(default=18.0)
    enabled_modules: Optional[str] = Field(default=None) # Liste des modules activés (ex: "inventory,sales,finance")
    logo_url: Optional[str] = Field(default=None)
    utc_offset: int = Field(default=1) # Décalage par rapport à UTC (ex: 1 pour UTC+1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # --- LICENSING & DEVICE LIMITS ---
    license_status: str = Field(default="pending") # pending, active, locked
    license_expiry: Optional[datetime] = Field(default=None)
    max_devices: int = Field(default=1)
    device_uuids: str = Field(default="[]") # JSON string containing active browser/device UUIDs
    
    # --- SATISFACTION RATING ---
    rating: int = Field(default=0)
    rating_prompt_enabled: bool = Field(default=False)
    rating_prompt_interval: str = Field(default="monthly") # daily, weekly, monthly
    last_rating_prompt_date: Optional[datetime] = Field(default=None)
    rating_prompt_triggered: bool = Field(default=False) # True if tech team manually requested it
    
    last_cloud_push: Optional[datetime] = Field(default=None) # Date du dernier push massif (30 jours)

    
    users: List["User"] = Relationship(back_populates="company")
    products: List["Product"] = Relationship(back_populates="company")
    sales: List["Sale"] = Relationship(back_populates="company")
    categories: List["Category"] = Relationship(back_populates="company")
    tickets: List["Ticket"] = Relationship(back_populates="company")
    expenses: List["Expense"] = Relationship(back_populates="company")
    suppliers: List["Supplier"] = Relationship(back_populates="company")
    budgets: List["Budget"] = Relationship(back_populates="company")
    system_messages: List["SystemMessage"] = Relationship(back_populates="company")


class SuperAdmin(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    full_name: str

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    name: str
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: str = Field(default="gerant") # gerant, caisse, magasinier...
    is_active: bool = Field(default=True)
    
    company: Company = Relationship(back_populates="users")
    sales: List["Sale"] = Relationship(back_populates="user")

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    name: str
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")
    
    company: Company = Relationship(back_populates="categories")
    products: List["Product"] = Relationship(back_populates="category")

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    name: str = Field(index=True)
    sku: Optional[str] = Field(default=None, index=True)
    barcode: Optional[str] = Field(default=None, index=True)
    price: float = Field(default=0.0)
    cost_price: float = Field(default=0.0)
    quantity: float = Field(default=0.0)
    unit: str = Field(default="unite")
    min_threshold: float = Field(default=5.0)
    supplier_id: Optional[int] = Field(default=None, foreign_key="supplier.id")
    attributes: str = Field(default="{}") # Stockage JSON pour attributs dynamiques (ex: date expiration, ingrédients)
    image_url: Optional[str] = Field(default=None) # URL ou Base64 de l'image du produit
    
    company: Company = Relationship(back_populates="products")
    category: Optional[Category] = Relationship(back_populates="products")
    supplier: Optional["Supplier"] = Relationship(back_populates="products")
    sale_items: List["SaleItem"] = Relationship(back_populates="product")

class RestaurantTable(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    number: str
    capacity: int = Field(default=4)
    status: str = Field(default="available") # available, occupied, reserved

class DiningSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    table_number: str
    access_code: str = Field(index=True, unique=True)
    client_name: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Sale(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    session_id: Optional[int] = Field(default=None, foreign_key="diningsession.id")
    table_number: Optional[str] = Field(default=None)
    total_amount: float
    discount: float = Field(default=0.0)
    tax_amount: float = Field(default=0.0)
    payment_method: str = Field(default="cash")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="completed")
    
    company: Company = Relationship(back_populates="sales")
    user: Optional[User] = Relationship(back_populates="sales")
    items: List["SaleItem"] = Relationship(back_populates="sale")

class SaleItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sale_id: int = Field(foreign_key="sale.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: float
    unit_price: float
    total: float
    
    sale: Sale = Relationship(back_populates="items")
    product: Product = Relationship(back_populates="sale_items")

class Supplier(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    name: str = Field(index=True)
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    
    company: Company = Relationship(back_populates="suppliers")
    products: List["Product"] = Relationship(back_populates="supplier")

class Budget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    category: str # Stock, Loyer, Salaires, Énergie, Autre
    amount: float # Plafond mensuel
    month: int # 1-12
    year: int
    
    company: Company = Relationship(back_populates="budgets")
    
class InventoryLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    change_qty: float
    type: str # IN, OUT, ADJUSTMENT, RETURN
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Ticket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    sale_id: int = Field(foreign_key="sale.id", unique=True)
    ticket_number: str = Field(index=True) # Ex: #10024
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    company: Company = Relationship(back_populates="tickets")
    sale: Sale = Relationship()

class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    category: str # Stock, Loyer, Salaires, Énergie, Autre
    description: Optional[str] = None
    amount: float
    date: datetime = Field(default_factory=datetime.utcnow)

    company: Company = Relationship(back_populates="expenses")

class ReportHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    filename: str
    type: str # PDF, EXCEL
    period: str # "Avril 2026"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
class RolePermission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    role: str # gerant, caisse, magasinier, comptable
    module: str # Dashboard, Ventes, Stocks, Finance, Personnel
    permission: str # view_stats, create_sale, view_stock, etc.
    is_enabled: bool = Field(default=False)
    
    company: Company = Relationship()

class SystemMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: Optional[int] = Field(default=None, foreign_key="company.id") # None pour TOUS
    title: str
    content: str
    image_url: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    company: Optional[Company] = Relationship(back_populates="system_messages")

class TechnicalNotification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: str # NEW_CLIENT, NEW_RATING
    title: str
    content: str
    is_read: bool = Field(default=False)
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
