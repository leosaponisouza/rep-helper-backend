-- Passo 1: Criar os ENUM Types
CREATE TYPE event_participant_status AS ENUM ('going', 'maybe', 'declined', 'invited');
CREATE TYPE activity_log_type AS ENUM ('task_completed', 'event_created', 'user_joined', 'task_assigned', 'event_reminder', 'expense_created', 'repayment_made');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');
CREATE TYPE expense_category_type AS ENUM ('rent', 'utilities', 'groceries', 'internet', 'maintenance', 'pet_supplies', 'other');
CREATE TYPE item_condition_type AS ENUM ('new', 'good', 'fair', 'poor');
CREATE TYPE auth_provider AS ENUM ('email', 'google.com', 'facebook.com', 'phone', 'github.com', 'custom');

-- Passo 2: Criar as Tabelas (SEM FOREIGN KEYS)
CREATE TABLE republics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(8) UNIQUE NOT NULL,
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20) NOT NULL,
    complement VARCHAR(255),
    neighborhood VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state CHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    owner_id VARCHAR(255) NOT NULL -- Esta coluna EXISTE, mas a constraint vem depois
);

CREATE TABLE users (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    profile_picture_url VARCHAR(255),
    current_republic_id UUID,  -- Esta coluna EXISTE, mas a constraint vem depois
    role VARCHAR(20) CHECK (role IN ('admin', 'user', 'resident')) DEFAULT 'user',
    status user_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    provider auth_provider NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    entry_date TIMESTAMP WITH TIME ZONE,
    departure_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    republic_id UUID NOT NULL, -- Esta coluna EXISTE, mas a constraint vem depois
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    category VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_tasks (
    user_id VARCHAR(255) NOT NULL, -- Esta coluna EXISTE, mas a constraint vem depois
    task_id INTEGER NOT NULL,      -- Esta coluna EXISTE, mas a constraint vem depois
    PRIMARY KEY (user_id, task_id)
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    republic_id UUID NOT NULL, -- Esta coluna EXISTE, mas a constraint vem depois
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE event_invitations (
    user_id VARCHAR(255) NOT NULL,  -- Esta coluna EXISTE, mas a constraint vem depois
    event_id INTEGER NOT NULL,      -- Esta coluna EXISTE, mas a constraint vem depois
    status event_participant_status DEFAULT 'invited',
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    republic_id UUID NOT NULL,  -- Esta coluna EXISTE, mas a constraint vem depois
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    category expense_category_type,
    receipt_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_splits (
    expense_id INTEGER NOT NULL,  -- Esta coluna EXISTE, mas a constraint vem depois
    user_id VARCHAR(255) NOT NULL,   -- Esta coluna EXISTE, mas a constraint vem depois
    amount DECIMAL(10, 2) NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (expense_id, user_id)
);

CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    republic_id UUID NOT NULL, -- Esta coluna EXISTE, mas a constraint vem depois
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    condition item_condition_type,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE polls (
   id SERIAL PRIMARY KEY,
   republic_id UUID NOT NULL,    -- Esta coluna EXISTE, mas a constraint vem depois
   question TEXT NOT NULL,
   start_date TIMESTAMP WITH TIME ZONE NOT NULL,
   end_date TIMESTAMP WITH TIME ZONE NOT NULL,
   created_by VARCHAR(255) NOT NULL,  -- Esta coluna EXISTE, mas a constraint vem depois
   FOREIGN KEY (created_by) REFERENCES "user"(uid) ON DELETE CASCADE -- Essa linha será removida.
);
CREATE TABLE poll_options (
    id SERIAL PRIMARY KEY,
    poll_id INTEGER NOT NULL,     -- Esta coluna EXISTE, mas a constraint vem depois
    option_text VARCHAR(255) NOT NULL,
    vote_count INTEGER DEFAULT 0
);

CREATE TABLE poll_votes (
    user_id VARCHAR(255) NOT NULL,       -- Esta coluna EXISTE, mas a constraint vem depois
    poll_option_id INTEGER NOT NULL,  -- Esta coluna EXISTE, mas a constraint vem depois
    PRIMARY KEY (user_id, poll_option_id)
);

CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    republic_id UUID,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Passo 3: Adicionar as Chaves Estrangeiras (ALTER TABLE)
-- rode isso após ter rodado a criação das tabelas.

ALTER TABLE republics
ADD CONSTRAINT fk_republic_owner
FOREIGN KEY (owner_id) REFERENCES users(uid) ON DELETE RESTRICT;

ALTER TABLE users
ADD CONSTRAINT fk_user_republic
FOREIGN KEY (current_republic_id) REFERENCES republics(id) ON DELETE SET NULL;

ALTER TABLE tasks
ADD CONSTRAINT fk_task_republic
FOREIGN KEY (republic_id) REFERENCES republics(id) ON DELETE CASCADE;

ALTER TABLE user_tasks
ADD CONSTRAINT fk_user_tasks_user
FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
ADD CONSTRAINT fk_user_tasks_task
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE events
ADD CONSTRAINT fk_event_republic
FOREIGN KEY (republic_id) REFERENCES republics(id) ON DELETE CASCADE;

ALTER TABLE event_invitations
ADD CONSTRAINT fk_event_invitations_user
FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
ADD CONSTRAINT fk_event_invitations_event
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE expenses
ADD CONSTRAINT fk_expenses_republic
FOREIGN KEY (republic_id) REFERENCES republics(id) ON DELETE CASCADE;

ALTER TABLE expense_splits
ADD CONSTRAINT fk_expense_splits_expense
FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_expense_splits_user
FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE;

ALTER TABLE inventory_items
ADD CONSTRAINT fk_inventory_items_republic
FOREIGN KEY (republic_id) REFERENCES republics(id) ON DELETE CASCADE;

ALTER TABLE polls
ADD CONSTRAINT fk_polls_republic
FOREIGN KEY (republic_id) REFERENCES republics(id) ON DELETE CASCADE,
ADD CONSTRAINT  fk_polls_user
FOREIGN KEY (created_by) REFERENCES users(uid) ON DELETE CASCADE;


ALTER TABLE poll_options
ADD CONSTRAINT fk_poll_options_poll
FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;

ALTER TABLE poll_votes
ADD CONSTRAINT fk_poll_votes_user
FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
ADD CONSTRAINT fk_poll_votes_poll_option
FOREIGN KEY (poll_option_id) REFERENCES poll_options(id) ON DELETE CASCADE;

ALTER TABLE activity_log
ADD CONSTRAINT fk_activity_log_user
FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL,
ADD CONSTRAINT fk_activity_log_republic
FOREIGN KEY (republic_id) REFERENCES republics(id) ON DELETE SET NULL;

-- Indices (Melhoram a performance das consultas) - Mantenha como antes, não muda
CREATE INDEX idx_republic_code ON republics(code);
CREATE INDEX idx_republic_owner_id ON republics(owner_id);
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_user_current_republic_id ON users(current_republic_id);
CREATE INDEX idx_task_republic_id ON tasks(republic_id);
CREATE INDEX idx_event_republic_id ON events(republic_id);
CREATE INDEX idx_expenses_republic_id ON expenses(republic_id);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX idx_inventory_items_republic_id ON inventory_items(republic_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_polls_republic_id ON polls(republic_id);
CREATE INDEX idx_polls_created_by ON polls(created_by);
CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX idx_poll_votes_poll_option_id ON poll_votes(poll_option_id);