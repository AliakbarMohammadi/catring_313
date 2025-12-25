-- Create daily_menus table
CREATE TABLE IF NOT EXISTS daily_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_menu_items table
CREATE TABLE IF NOT EXISTS daily_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_menu_id UUID NOT NULL REFERENCES daily_menus(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(daily_menu_id, food_item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_menus_date ON daily_menus(date);
CREATE INDEX IF NOT EXISTS idx_daily_menus_is_published ON daily_menus(is_published);
CREATE INDEX IF NOT EXISTS idx_daily_menu_items_daily_menu_id ON daily_menu_items(daily_menu_id);
CREATE INDEX IF NOT EXISTS idx_daily_menu_items_food_item_id ON daily_menu_items(food_item_id);

-- Create trigger to automatically update updated_at for daily_menus
CREATE TRIGGER update_daily_menus_updated_at 
    BEFORE UPDATE ON daily_menus 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for daily_menu_items
CREATE TRIGGER update_daily_menu_items_updated_at 
    BEFORE UPDATE ON daily_menu_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure sold_quantity doesn't exceed available_quantity
ALTER TABLE daily_menu_items 
ADD CONSTRAINT check_sold_quantity_limit 
CHECK (sold_quantity <= available_quantity);