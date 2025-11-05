#!/usr/bin/env python3
"""
測試「我的債務人管理」私密欄位和備註時間軸 API
使用方式：python test-private-fields-api.py
"""

import requests
import json
from datetime import datetime

# 設定變數
BASE_URL = "https://www.zhenhaoxun.com"
ACCOUNT = "q689594"
PASSWORD = "q6969520"

def print_section(title):
    """列印區塊標題"""
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60 + "\n")

def print_response(title, response):
    """列印 API 回應"""
    print(f"{title}")
    print(f"狀態碼: {response.status_code}")
    try:
        data = response.json()
        print(f"回應內容: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return data
    except:
        print(f"回應內容: {response.text}")
        return None

def main():
    print_section("測試「我的債務人管理」私密欄位和備註時間軸 API")
    
    # 1. 登入取得 token
    print("1. 登入取得 token...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "account": ACCOUNT,
            "password": PASSWORD,
            "keepLoggedIn": True
        }
    )
    
    login_data = print_response("登入回應：", login_response)
    
    if not login_data or not login_data.get("success"):
        print("❌ 登入失敗")
        return
    
    access_token = login_data["data"]["session"]["access_token"]
    print(f"\n✅ 登入成功，access_token: {access_token[:50]}...")
    
    # 2. 取得我的債務記錄列表
    print("\n2. 取得我的債務記錄列表...")
    my_debtors_response = requests.get(
        f"{BASE_URL}/api/debts/my-debtors",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    my_debtors_data = print_response("我的債務記錄回應：", my_debtors_response)
    
    if not my_debtors_data or not my_debtors_data.get("data"):
        print("❌ 沒有找到債務記錄")
        return
    
    debt_record_id = my_debtors_data["data"][0]["id"]
    debtor_name = my_debtors_data["data"][0]["debtor_name"]
    print(f"\n✅ 找到債務記錄 ID: {debt_record_id}")
    print(f"   債務人姓名: {debtor_name}")
    
    # 3. 更新私密欄位
    print("\n3. 更新私密欄位...")
    update_private_fields_response = requests.patch(
        f"{BASE_URL}/api/debts/{debt_record_id}/private-fields",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={
            "settled_amount": 100000,
            "recovered_amount": 50000,
            "bad_debt_amount": 30000,
            "internal_rating": 4
        }
    )
    
    update_data = print_response("更新私密欄位回應：", update_private_fields_response)
    
    if update_data and update_data.get("success"):
        print("\n✅ 私密欄位更新成功")
    else:
        print("\n❌ 私密欄位更新失敗")
    
    # 4. 新增備註
    print("\n4. 新增備註...")
    create_note_response = requests.post(
        f"{BASE_URL}/api/debts/{debt_record_id}/notes",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={
            "content": f"測試備註：這是一筆測試備註，用於驗證備註時間軸功能是否正常運作。時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        }
    )
    
    create_note_data = print_response("新增備註回應：", create_note_response)
    
    if create_note_data and create_note_data.get("success"):
        print("\n✅ 備註新增成功")
    else:
        print("\n❌ 備註新增失敗")
    
    # 5. 取得備註列表
    print("\n5. 取得備註列表...")
    get_notes_response = requests.get(
        f"{BASE_URL}/api/debts/{debt_record_id}/notes",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    get_notes_data = print_response("備註列表回應：", get_notes_response)
    
    if get_notes_data and get_notes_data.get("data"):
        note_count = len(get_notes_data["data"])
        print(f"\n✅ 找到 {note_count} 筆備註")
    else:
        print("\n❌ 無法取得備註列表")
    
    # 6. 再次取得我的債務記錄，確認私密欄位已更新
    print("\n6. 再次取得我的債務記錄，確認私密欄位已更新...")
    my_debtors_response_2 = requests.get(
        f"{BASE_URL}/api/debts/my-debtors",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    my_debtors_data_2 = my_debtors_response_2.json()
    
    # 找到剛才更新的債務記錄
    updated_record = None
    for record in my_debtors_data_2["data"]:
        if record["id"] == debt_record_id:
            updated_record = record
            break
    
    if updated_record:
        print("\n更新後的債務記錄：")
        print(f"  債務人姓名: {updated_record['debtor_name']}")
        print(f"  結清金額: {updated_record.get('settled_amount')}")
        print(f"  已收回金額: {updated_record.get('recovered_amount')}")
        print(f"  呆帳金額: {updated_record.get('bad_debt_amount')}")
        print(f"  內部評價: {updated_record.get('internal_rating')}")
    
    # 7. 總結
    print_section("測試總結")
    
    all_passed = True
    
    print("功能驗證：")
    
    # 檢查登入
    if login_data and login_data.get("success"):
        print("  ✅ 登入功能正常")
    else:
        print("  ❌ 登入功能異常")
        all_passed = False
    
    # 檢查取得債務記錄
    if my_debtors_data and my_debtors_data.get("data"):
        print("  ✅ 取得我的債務記錄正常")
    else:
        print("  ❌ 取得我的債務記錄異常")
        all_passed = False
    
    # 檢查更新私密欄位
    if update_data and update_data.get("success"):
        print("  ✅ 更新私密欄位正常")
    else:
        print("  ❌ 更新私密欄位異常")
        all_passed = False
    
    # 檢查新增備註
    if create_note_data and create_note_data.get("success"):
        print("  ✅ 新增備註正常")
    else:
        print("  ❌ 新增備註異常")
        all_passed = False
    
    # 檢查取得備註列表
    if get_notes_data and get_notes_data.get("data"):
        print("  ✅ 取得備註列表正常")
    else:
        print("  ❌ 取得備註列表異常")
        all_passed = False
    
    # 檢查私密欄位資料
    if updated_record:
        if (updated_record.get('settled_amount') == 100000 and
            updated_record.get('recovered_amount') == 50000 and
            updated_record.get('bad_debt_amount') == 30000 and
            updated_record.get('internal_rating') == 4):
            print("  ✅ 私密欄位資料正確儲存")
        else:
            print("  ❌ 私密欄位資料不正確")
            all_passed = False
    else:
        print("  ❌ 無法驗證私密欄位資料")
        all_passed = False
    
    print()
    if all_passed:
        print("🎉 所有測試通過！")
    else:
        print("⚠️  部分測試失敗")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()

