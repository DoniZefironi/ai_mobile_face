import os
import json
import cv2
import numpy as np
from deepface import DeepFace
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = "postgresql://postgres:4450@localhost:5432/fashion_ai"
engine = create_engine(DATABASE_URL)

CELEB_DIR = "../static/celebrities"

celebrity_data = {
    "timothée_chalamet.jpg": {
        "name": "Тимоти Шаламе",
        "style_description": "Авангардный, смелый, гендерно-размытый. Часто выбирает нестандартные сочетания: атласные рубашки с вышивкой, бархатные блейзеры, прозрачные топы, яркие цвета и неожиданные аксессуары от ведущих дизайнеров.",
        "shops_links": "https://www.mrporter.com, https://www.farfetch.com, https://www.ssense.com"
    },
    "zendaya.jpg": {
        "name": "Зендея",
        "style_description": "Трансформационный, элегантный, театральный. От спортивного стрита до высокой моды на красной дорожке. Мастерски сочетает винтажные вещи с современными дизайнерскими работами, создавая запоминающиеся образы с историей.",
        "shops_links": "https://www.net-a-porter.com, https://www.matchesfashion.com, https://www.mytheresa.com"
    },
    "harry_styles.jpg": {
        "name": "Гарри Стайлз",
        "style_description": "Рок-н-ролльный, эксцентричный, радостный. Известен любовью к широким брюкам, ярким костюмам, блесткам, жемчугу, прозрачным блузам и смелому сочетанию узоров. Пропагандирует свободу самовыражения через одежду.",
        "shops_links": "https://gucci.com, https://www.gucci.com, https://www.celine.com"
    },
    "bella_hadid.jpg": {
        "name": "Белла Хадид",
        "style_description": "Минималистичный, остромодный, урбанистический. Предпочитает чистые линии, нейтральные цвета (черный, бежевый, белый), базовые вещи идеального кроя, винтажные джинсы и эффектные аксессуары вроде солнцезащитных очков необычной формы.",
        "shops_links": "https://www.thefrankieshop.com, https://le17septembre.com, https://www.shopbop.com"
    },
    "lana_del_rey.jpg": {
        "name": "Лана Дель Рей",
        "style_description": "Романтичный, меланхоличный, винтажный глэм-американский стиль. Платья в цветочек, кружево, деним, ковбойские сапоги, солнечные очки в стиле ретро, шелковые платки и украшения с драгоценными камнями.",
        "shops_links": "https://realisationpar.com, https://www.freepeople.com, https://www.revolve.com"
    },
    "kanye_west.jpg": {
        "name": "Канье Уэст",
        "style_description": "Урбанистический, минималистичный, монохромный. Заложил основы современного стритвира: однотонные худи, футболки, кроп-топы, узкие джинсы и высокие кроссовки. Часто носит веearth тонов и технические материалы.",
        "shops_links": "https://yeezygap.com, https://www.balenciaga.com, https://www.farfetch.com"
    },
    "kiko_mizuhara.jpg": {
        "name": "Кико Мизухара",
        "style_description": "Эклектичный, смелый, творческий. Свободно смешивает японские дизайнерские бренды, винтаж, уличную моду и высокое искусство. Любит объемные силуэты, яркие принты и необычные текстуры.",
        "shops_links": "https://www.doverstreetmarket.com, https://www.kenzo.com, https://www.commedesgarcons.com"
    },
    "travis_scott.jpg": {
        "name": "Трэвис Скотт",
        "style_description": "Хип-хоп стритвир с элементами гранжа и панка. Футболки с принтами групп, оверсайз худи, потертые джинсы, кроссовки ограниченных выпусков, кепки и много аксессуаров (цепочки, кольца).",
        "shops_links": "https://nike.com, https://www.travisscott.com, https://www.dsm.com"
    },
    "david_bowie.jpg": {
        "name": "Дэвид Боуи",
        "style_description": "Андрогинный, театральный, постоянно меняющийся. Икона стиля, создававшая целые персонажи через одежду: Зигги Стардаст, Тонкий Белый Герцог. Костюмы, андрогинная эстетика, смелые цветовые решения.",
        "shops_links": "https://www.mrporter.com, https://www.farfetch.com, https://www.yoox.com"
    },
    "phoebe_philo.jpg": {
        "name": "Фиби Файло",
        "style_description": "Культовый минимализм. Чистые линии, роскошные ткани (кашемир, шелк, кожзам), нейтральная палитра, идеальный крой. Создательница 'старой Celine', чей личный стиль стал эталоном тихой роскоши.",
        "shops_links": "https://phoebephilo.com, https://www.therow.com, https://www.jilsander.com"
    }
}

def create_table():
    with engine.connect() as conn:
        create_table_query = text("""
            CREATE TABLE IF NOT EXISTS celebrity_faces (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                photo_path VARCHAR(500),
                embedding JSONB,
                style_description TEXT,
                shops_links TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute(create_table_query)
        conn.commit()
        print("✅ Таблица 'celebrity_faces' создана или уже существует")

def get_embedding(image_path: str):
    try:
        img = cv2.imread(image_path)
        if img is None:
            print(f"Не удалось загрузить: {image_path}")
            return None
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        detectors = ["retinaface", "mtcnn", "opencv", "ssd", "dlib"]
        for det in detectors:
            try:
                result = DeepFace.represent(
                    img_rgb,
                    model_name="ArcFace", 
                    detector_backend=det,
                    enforce_detection=True,
                    align=True
                )
                if result:
                    emb = result[0]["embedding"]
                    return json.dumps(emb)
            except Exception as e:
                continue
        return None
    except Exception as e:
        print(f"Ошибка при обработке {image_path}: {e}")
        return None

def main():
    create_table()
    
    with engine.connect() as conn:
        for filename, meta in celebrity_data.items():
            filepath = os.path.join(CELEB_DIR, filename)
            if not os.path.exists(filepath):
                print(f"Файл не найден: {filepath}")
                continue

            embedding = get_embedding(filepath)
            if embedding is None:
                print(f"Не удалось извлечь embedding для {filename}")
                continue

            photo_url = f"/static/celebrities/{filename}"

            query = text("""
                INSERT INTO celebrity_faces (name, photo_path, embedding, style_description, shops_links)
                VALUES (:name, :photo_path, :embedding, :style_description, :shops_links)
                ON CONFLICT DO NOTHING
            """)
            conn.execute(query, {
                "name": meta["name"],
                "photo_path": photo_url,
                "embedding": embedding,
                "style_description": meta["style_description"],
                "shops_links": meta["shops_links"]
            })
            print(f"Добавлено: {meta['name']}")
        conn.commit()

if __name__ == "__main__":
    main()