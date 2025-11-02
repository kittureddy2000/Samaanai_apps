#!/bin/bash

##############################################################################
# Quick Local Development Script
# Usage: ./dev.sh [command]
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Parse command
COMMAND=${1:-help}

case "$COMMAND" in
    start)
        print_header "🚀 Starting Local Development Environment"

        # Build and start containers
        docker-compose up --build -d

        # Wait for services to be healthy
        print_info "Waiting for services to be ready..."
        sleep 5

        # Run migrations
        print_info "Running database migrations..."
        docker-compose exec backend npx prisma migrate dev --name local_dev

        print_success "Local environment is ready!"
        echo ""
        echo "📱 Frontend: http://localhost:19006"
        echo "🔧 Backend API: http://localhost:8080"
        echo "🗄️  Database: localhost:5432"
        echo ""
        echo "Run './dev.sh logs' to view logs"
        echo "Run './dev.sh stop' to stop all services"
        ;;

    quick)
        print_header "⚡ Quick Start (No Rebuild)"
        docker-compose up -d
        print_success "Services started!"
        echo ""
        echo "📱 Frontend: http://localhost:19006"
        echo "🔧 Backend API: http://localhost:8080"
        ;;

    stop)
        print_header "🛑 Stopping Services"
        docker-compose down
        print_success "All services stopped"
        ;;

    restart)
        print_header "🔄 Restarting Services"
        docker-compose restart
        print_success "Services restarted"
        ;;

    logs)
        print_header "📋 Viewing Logs (Ctrl+C to exit)"
        docker-compose logs -f
        ;;

    backend-logs)
        print_header "📋 Backend Logs (Ctrl+C to exit)"
        docker-compose logs -f backend
        ;;

    frontend-logs)
        print_header "📋 Frontend Logs (Ctrl+C to exit)"
        docker-compose logs -f frontend
        ;;

    test)
        print_header "🧪 Running Backend Tests"
        docker-compose exec backend npm test
        ;;

    migrate)
        print_header "🗄️  Running Database Migrations"
        docker-compose exec backend npx prisma migrate dev
        print_success "Migrations complete"
        ;;

    seed)
        print_header "🌱 Seeding Database"
        docker-compose exec backend npx prisma db seed
        print_success "Database seeded"
        ;;

    clean)
        print_header "🧹 Cleaning Up (Removing containers and volumes)"
        print_info "This will delete all local data!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            print_success "Cleanup complete"
        else
            print_info "Cleanup cancelled"
        fi
        ;;

    rebuild)
        print_header "🔨 Rebuilding Containers"
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        print_success "Rebuild complete"
        ;;

    shell-backend)
        print_header "🐚 Opening Backend Shell"
        docker-compose exec backend sh
        ;;

    shell-db)
        print_header "🗄️  Opening Database Shell"
        docker-compose exec postgres psql -U postgres -d samaanai_dev
        ;;

    status)
        print_header "📊 Service Status"
        docker-compose ps
        ;;

    help|*)
        print_header "🛠️  Local Development Helper"
        echo ""
        echo "Quick commands:"
        echo ""
        echo "  ${GREEN}./dev.sh start${NC}          - Build and start all services + run migrations"
        echo "  ${GREEN}./dev.sh quick${NC}          - Start services without rebuild (faster)"
        echo "  ${GREEN}./dev.sh stop${NC}           - Stop all services"
        echo "  ${GREEN}./dev.sh restart${NC}        - Restart all services"
        echo ""
        echo "Development:"
        echo ""
        echo "  ${GREEN}./dev.sh logs${NC}           - View all logs (live)"
        echo "  ${GREEN}./dev.sh backend-logs${NC}   - View backend logs only"
        echo "  ${GREEN}./dev.sh frontend-logs${NC}  - View frontend logs only"
        echo "  ${GREEN}./dev.sh test${NC}           - Run backend tests"
        echo "  ${GREEN}./dev.sh migrate${NC}        - Run database migrations"
        echo "  ${GREEN}./dev.sh seed${NC}           - Seed database with test data"
        echo ""
        echo "Utilities:"
        echo ""
        echo "  ${GREEN}./dev.sh status${NC}         - Show service status"
        echo "  ${GREEN}./dev.sh shell-backend${NC}  - Open backend container shell"
        echo "  ${GREEN}./dev.sh shell-db${NC}       - Open database shell"
        echo "  ${GREEN}./dev.sh rebuild${NC}        - Rebuild containers from scratch"
        echo "  ${GREEN}./dev.sh clean${NC}          - Remove all containers and data"
        echo ""
        echo "Services:"
        echo ""
        echo "  📱 Frontend: http://localhost:19006"
        echo "  🔧 Backend:  http://localhost:8080"
        echo "  🗄️  Database: localhost:5432"
        echo ""
        ;;
esac
