"""merge mozilla updates with schema from master

Revision ID: fbc0849e2674
Revises: 6b5be7e0a0ef, 7671dca4e604
Create Date: 2017-12-12 04:45:34.360587

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fbc0849e2674'
down_revision = ('6b5be7e0a0ef', '7671dca4e604')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
