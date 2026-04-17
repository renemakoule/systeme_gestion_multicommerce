import os
import sys
from sqlmodel import Session, select, create_engine, SQLModel

# Add the current directory to sys.path to allow relative imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db import engine
from database.models import (
    Company, User, Product, Category, Sale, SaleItem, 
    Supplier, InventoryLog, Ticket, Expense, Budget
)

def cleanup_database():
    print("--- Starting database cleanup ---")
    
    with Session(engine) as session:
        # 1. Identify companies without a manager
        all_companies = session.exec(select(Company)).all()
        companies_to_delete = []
        
        for company in all_companies:
            # Check for manager (role="gerant")
            manager = session.exec(
                select(User).where(User.company_id == company.id, User.role == "gerant")
            ).first()
            
            if not manager:
                companies_to_delete.append(company)
        
        if not companies_to_delete:
            print("No incomplete companies found (all have managers).")
        else:
            print(f"Found {len(companies_to_delete)} incomplete companies to delete.")
            
            for company in companies_to_delete:
                print(f"Cleaning data for company: {company.name} (ID: {company.id})")
                
                # Delete related records (manual cascade for SQLite)
                
                # Sale items (via Sales)
                sales = session.exec(select(Sale).where(Sale.company_id == company.id)).all()
                sale_ids = [s.id for s in sales]
                if sale_ids:
                    sale_items = session.exec(select(SaleItem).where(SaleItem.sale_id.in_(sale_ids))).all()
                    for item in sale_items:
                        session.delete(item)
                    print(f"  - Deleted {len(sale_items)} sale items")
                
                # Tickets
                tickets = session.exec(select(Ticket).where(Ticket.company_id == company.id)).all()
                for ticket in tickets:
                    session.delete(ticket)
                print(f"  - Deleted {len(tickets)} tickets")
                
                # Sales
                for sale in sales:
                    session.delete(sale)
                print(f"  - Deleted {len(sales)} sales")
                
                # Products (and their logs)
                products = session.exec(select(Product).where(Product.company_id == company.id)).all()
                product_ids = [p.id for p in products]
                if product_ids:
                    inventory_logs = session.exec(select(InventoryLog).where(InventoryLog.product_id.in_(product_ids))).all()
                    for log in inventory_logs:
                        session.delete(log)
                    print(f"  - Deleted {len(inventory_logs)} inventory logs")
                
                for product in products:
                    session.delete(product)
                print(f"  - Deleted {len(products)} products")
                
                # Categories
                categories = session.exec(select(Category).where(Category.company_id == company.id)).all()
                for cat in categories:
                    session.delete(cat)
                print(f"  - Deleted {len(categories)} categories")
                
                # Suppliers
                suppliers = session.exec(select(Supplier).where(Supplier.company_id == company.id)).all()
                for supplier in suppliers:
                    session.delete(supplier)
                print(f"  - Deleted {len(suppliers)} suppliers")
                
                # Budgets
                budgets = session.exec(select(Budget).where(Budget.company_id == company.id)).all()
                for budget in budgets:
                    session.delete(budget)
                print(f"  - Deleted {len(budgets)} budgets")
                
                # Expenses
                expenses = session.exec(select(Expense).where(Expense.company_id == company.id)).all()
                for expense in expenses:
                    session.delete(expense)
                print(f"  - Deleted {len(expenses)} expenses")
                
                # Users
                users = session.exec(select(User).where(User.company_id == company.id)).all()
                for user in users:
                    session.delete(user)
                print(f"  - Deleted {len(users)} users")
                
                # Finally, the company itself
                session.delete(company)
                print(f"  - Deleted company: {company.name}")

        # 2. Identify and delete orphan users (not belonging to any existing company)
        # First get all valid company IDs
        valid_company_ids = [c.id for c in session.exec(select(Company)).all()]
        
        orphan_users = session.exec(
            select(User).where(User.company_id.not_in(valid_company_ids))
        ).all()
        
        if orphan_users:
            print(f"Found {len(orphan_users)} orphan users to delete.")
            for user in orphan_users:
                session.delete(user)
                print(f"  - Deleted orphan user: {user.username}")
        else:
            print("No orphan users found.")

        # Commit all deletions
        session.commit()
        print("--- Cleanup complete ---")

if __name__ == "__main__":
    cleanup_database()
